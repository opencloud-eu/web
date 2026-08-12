import { Resource } from '@opencloud-eu/web-client'
import { FolderVaultEngine, streamToArrayBuffer } from '@opencloud-eu/web-pkg'
import { createEngine } from './crypto/engine'
import { INTEGRITY_ID_PROP, integrityTokenOf, VaultTarget, writeIntegrityToken } from './integrity'

export type UnlockResult =
  /** The passphrase holds up; `engine` is the one to stash for the session. */
  | { status: 'unlocked'; engine: FolderVaultEngine }
  /** Cryptographically ruled out, as opposed to a request that simply failed. */
  | { status: 'wrong-passphrase' }

/**
 * An rclone-crypt file is a 32-byte header (magic + nonce) followed by
 * Poly1305-sealed blocks. At exactly 32 bytes there are no blocks, so nothing is
 * authenticated and *any* key "decrypts" it - such a file proves nothing.
 */
const FILE_HEADER_SIZE = 32

/** One sealed rclone-crypt block: 64 KiB of data plus its 16-byte Poly1305 tag. */
const BLOCK_SIZE = 16 + 64 * 1024

/** Read the vault root itself, with the integrity token property requested. */
function readVaultRoot({ webdav, space, vaultRoot }: VaultTarget): Promise<Resource | undefined> {
  return webdav.getFileInfo(space, { path: vaultRoot }, { extraProps: [INTEGRITY_ID_PROP] })
}

/**
 * Retrieve an encrypted file name and file from the server, if any, to verify
 * a passphrase against. The name is cheap to get but only plausibly proves a
 * passphrase, while the file content carries a cryptographic proof.
 * This gets used when there is no integrity token, or one that doesn't match
 * the passphrase.
 */
export async function readVaultSamples(
  { webdav, space, vaultRoot }: VaultTarget,
  root?: Resource
): Promise<{
  /** Any encrypted child name, for the cheap `verifySegment` pre-check. */
  name: string | undefined
  /** Smallest file whose content is actually authenticated, if the vault has one. */
  file: Resource | undefined
}> {
  const { children } = await webdav.listFiles(
    space,
    root?.id ? { fileId: root.id } : { path: vaultRoot }
  )
  const list = children ?? []
  return {
    name: list.find((c) => c?.name)?.name,
    // Cheapest definitive evidence: smallest is fine.
    file: list
      .filter((c) => c && !c.isFolder && Number(c.size) > FILE_HEADER_SIZE)
      .sort((a, b) => Number(a.size) - Number(b.size))[0]
  }
}

/**
 * Prove a passphrase against a file's content. Unlike a name, content carries a
 * Poly1305 tag, so a successful decrypt is cryptographic proof rather than a
 * plausibility guess - the same strength as the integrity token itself.
 */
async function verifyAgainstContent(
  { webdav, space }: VaultTarget,
  engine: FolderVaultEngine,
  file: Resource
): Promise<boolean> {
  // Fetch outside the try: a transport error is not a wrong passphrase, so let it
  // reach the caller and its "please try again" message. The vault is still
  // locked, so the decorator hands back raw ciphertext and `file.path` is already
  // the encrypted server path.
  //
  // Only the file header plus the first sealed block is asked for: that block
  // authenticates on its own, so anything beyond it would be a download (and a
  // decrypt) of a whole - possibly huge - file for no extra proof. A server that
  // ignores the range simply hands back the entire file, which still decrypts.
  const { body } = await webdav.getFileContents(
    space,
    { fileId: file.id },
    {
      responseType: 'arraybuffer',
      headers: { Range: `bytes=0-${FILE_HEADER_SIZE + BLOCK_SIZE - 1}` }
    }
  )
  try {
    await streamToArrayBuffer(engine.decryptContent(new Blob([body]).stream()))
    return true
  } catch {
    // Failed Poly1305 tag - the passphrase is definitively wrong.
    return false
  }
}

/** Whether the vault still needs setup and is without a passphrase (= new vault). */
export async function probeVaultNeedsSetup(target: VaultTarget): Promise<boolean> {
  const root = await readVaultRoot(target)
  if (integrityTokenOf(root)) {
    // A token means we can safely assume the vault is set up.
    return false
  }
  // No token: the vault might still be set up (e.g. outside of Web, hence no token).
  // Check for any content if this is the case.
  return !(await readVaultSamples(target, root)).name
}

/**
 * Verify `passphrase` against the vault and, where that proves it, commit the
 * vault to it by writing an integrity token.
 *
 * Throws on anything that isn't a verdict on the passphrase - a failed request,
 * or a brand new vault whose token could not be written - so callers can offer a
 * retry instead of blaming the passphrase.
 */
export async function unlockVault(target: VaultTarget, passphrase: string): Promise<UnlockResult> {
  // Re-read the token against the live server rather than trusting an earlier
  // probe. The engine built here is also the one handed back, so it doubles as
  // the session's unlocked engine.
  const root = await readVaultRoot(target)
  const token = integrityTokenOf(root)
  const engine = createEngine(target.vaultRoot, passphrase)

  // A verified token is a cryptographic proof of the passphrase.
  if (token && (await engine.verifyIntegrityToken(token))) {
    return { status: 'unlocked', engine }
  }

  // No token, or one that doesn't match. A mismatch is not the final word: the
  // token lives in a property that anyone with write access to the vault root
  // can overwrite, and a setup race between two clients leaves one behind that
  // the other's passphrase never verifies. File content carries its own
  // Poly1305 tag, so it outranks the token - where a file decrypts, the
  // passphrase is proven and the token is the thing that is wrong.
  const { name, file } = await readVaultSamples(target, root)

  const vaultIsEmpty = !name
  if (vaultIsEmpty) {
    if (token) {
      // An empty vault holds nothing to overrule the token with, and writing a
      // fresh one would let any passphrase take the vault over.
      return { status: 'wrong-passphrase' }
    }
    // Brand new vault. Writing the token is what commits the passphrase, so let
    // a failure surface - otherwise the user could silently pick a different
    // passphrase next time, which is the confusion tokens prevent.
    await writeIntegrityToken(target, engine)
    return { status: 'unlocked', engine }
  }

  if (!file) {
    // Nothing authenticated to check against (only folders, or empty files), so
    // all that's left is decrypting a name - a plausibility check. Weak enough
    // that it may neither commit a token nor overrule one that failed above.
    return !token && (await engine.verifySegment(name))
      ? { status: 'unlocked', engine }
      : { status: 'wrong-passphrase' }
  }

  // A vault with content: let the content decide. This is 100% proof, so it is
  // also what a token gets written from - committing one off the back of the
  // name check could lock the user out with a passphrase that merely looked
  // plausible.
  if (!(await verifyAgainstContent(target, engine, file))) {
    return { status: 'wrong-passphrase' }
  }

  // Writing properties needs write permission, which a viewer on a shared vault
  // or a public-link visitor doesn't have. The passphrase is proven by now, so
  // failing here must not keep the user out -> catch and log the error only.
  try {
    await writeIntegrityToken(target, engine)
  } catch (e) {
    console.warn('[rclone-crypt] could not store the vault integrity token', e)
  }

  return { status: 'unlocked', engine }
}
