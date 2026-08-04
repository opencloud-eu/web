import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { streamToArrayBuffer } from '@opencloud-eu/web-pkg'
import { probeVaultNeedsSetup, unlockVault, VaultTarget } from '../../src/unlock'
import { createEngine } from '../../src/crypto/engine'
import { INTEGRITY_ID_PROP } from '../../src/integrity'

const vaultRoot = '/my.vault'
const passphrase = 'foobar'
// "report.txt" encrypted with the passphrase above - the sample `verifySegment`
// decrypts when a vault carries no integrity token.
const encryptedChildName = 'unq54c7b9fj4lam8t82q1hofdo'

function tokenFor(password: string): Promise<string> {
  return createEngine(vaultRoot, password).createIntegrityToken()
}

/** Real rclone-crypt ciphertext for `content`, as the server would hold it. */
function encryptedFile(password: string, content: string): Promise<ArrayBuffer> {
  const engine = createEngine(vaultRoot, password)
  return streamToArrayBuffer(engine.encryptContent(new Blob([content]).stream()))
}

type Child = { name: string; isFolder?: boolean; size?: number }

async function createTarget({
  token = null,
  children = [],
  /** Ciphertext the sampled file returns; defaults to a blob under `passphrase`. */
  fileContent,
  rootId = 'id-root',
  driveType = 'project'
}: {
  token?: string | null
  children?: Child[]
  fileContent?: ArrayBuffer
  rootId?: string
  driveType?: string
} = {}) {
  const webdav = mock<WebDAV>()

  // The vault root alone (depth 0) carries the integrity token...
  webdav.getFileInfo.mockResolvedValue({
    id: rootId,
    path: vaultRoot,
    ...(token && { extraProps: { [INTEGRITY_ID_PROP]: token } })
  } as unknown as Resource)
  // ...and the listing is only needed when there is no token.
  webdav.listFiles.mockResolvedValue({
    resource: { path: vaultRoot } as unknown as Resource,
    children: children.map(
      ({ name, isFolder = false, size = 1024 }) =>
        ({
          id: `id-${name}`,
          name,
          path: `${vaultRoot}/${name}`,
          isFolder,
          size: String(size)
        }) as unknown as Resource
    )
  })
  webdav.getFileContents.mockResolvedValue({
    body: fileContent ?? (await encryptedFile(passphrase, 'hello vault'))
  } as never)
  webdav.setProperties.mockResolvedValue(undefined as never)

  const space = mock<SpaceResource>({ id: 'space-1', driveType })

  return { target: { webdav, space, vaultRoot } as VaultTarget, webdav, space }
}

/** The token handed to setProperties, so tests can verify it independently. */
function writtenToken(webdav: WebDAV): string {
  const [, , properties] = vi.mocked(webdav.setProperties).mock.calls[0]
  return (properties as Record<string, string>)[INTEGRITY_ID_PROP]
}

describe('unlockVault', () => {
  describe('a vault carrying an integrity token', () => {
    it('unlocks with the right passphrase and writes nothing', async () => {
      const { target, webdav } = await createTarget({ token: await tokenFor(passphrase) })

      const result = await unlockVault(target, passphrase)

      expect(result.status).toBe('unlocked')
      // The passphrase is already committed - nothing to write on a plain unlock.
      expect(webdav.setProperties).not.toHaveBeenCalled()
    })

    it('rejects a wrong passphrase without overwriting the token', async () => {
      const { target, webdav } = await createTarget({
        token: await tokenFor(passphrase),
        children: [{ name: encryptedChildName }]
      })

      const result = await unlockVault(target, 'definitely-wrong')

      expect(result.status).toBe('wrong-passphrase')
      expect(webdav.setProperties).not.toHaveBeenCalled()
    })

    it('unlocks and repairs a token that no passphrase verifies', async () => {
      // The token sits in a property anyone with write access to the vault root
      // can overwrite, and a setup race between two clients leaves one behind
      // that the other's passphrase never verifies. Content is authenticated,
      // so it outranks the token - otherwise the owner is locked out for good.
      const { target, webdav } = await createTarget({
        token: await tokenFor('someone-elses-passphrase'),
        children: [{ name: encryptedChildName }]
      })

      const result = await unlockVault(target, passphrase)

      expect(result.status).toBe('unlocked')
      const engine = createEngine(vaultRoot, passphrase)
      expect(await engine.verifyIntegrityToken(writtenToken(webdav))).toBe(true)
    })

    it('rejects a wrong passphrase against a token an empty vault cannot overrule', async () => {
      const { target, webdav } = await createTarget({ token: await tokenFor(passphrase) })

      const result = await unlockVault(target, 'definitely-wrong')

      expect(result.status).toBe('wrong-passphrase')
      expect(webdav.setProperties).not.toHaveBeenCalled()
    })

    it('rejects a wrong passphrase when the vault holds no authenticated content', async () => {
      // Only a name to go by, and decrypting one is a plausibility guess with no
      // tag behind it - far too weak to overrule a token.
      const { target, webdav } = await createTarget({
        token: await tokenFor('someone-elses-passphrase'),
        children: [{ name: encryptedChildName, isFolder: true }]
      })

      const result = await unlockVault(target, passphrase)

      expect(result.status).toBe('wrong-passphrase')
      expect(webdav.setProperties).not.toHaveBeenCalled()
    })

    it('asks for the token per request and never lists the children', async () => {
      // The token answers everything, so the common case stays at depth 0. The
      // prop is requested per call rather than registered globally, so no other
      // PROPFIND in the app carries it.
      const { target, webdav, space } = await createTarget({ token: await tokenFor(passphrase) })

      await unlockVault(target, passphrase)

      expect(webdav.getFileInfo).toHaveBeenCalledWith(
        space,
        { path: vaultRoot },
        { extraProps: [INTEGRITY_ID_PROP] }
      )
      expect(webdav.listFiles).not.toHaveBeenCalled()
    })
  })

  describe('a vault with content but no token', () => {
    it('proves the passphrase against file content, then backfills a token', async () => {
      const { target, webdav, space } = await createTarget({
        children: [{ name: encryptedChildName }]
      })

      const result = await unlockVault(target, passphrase)

      expect(result.status).toBe('unlocked')
      expect(webdav.setProperties).toHaveBeenCalledWith(
        space,
        { path: vaultRoot },
        expect.objectContaining({ [INTEGRITY_ID_PROP]: expect.any(String) }),
        // Required, or the prop is written as `oc:ocrclone:integrity-id` and can
        // never be read back - a 207 that silently loses the passphrase.
        { extraProps: [INTEGRITY_ID_PROP] }
      )
      // The backfilled token has to verify under the passphrase we just used.
      const engine = createEngine(vaultRoot, passphrase)
      expect(await engine.verifyIntegrityToken(writtenToken(webdav))).toBe(true)
    })

    it('rejects a wrong passphrase and backfills nothing', async () => {
      const { target, webdav } = await createTarget({ children: [{ name: encryptedChildName }] })

      const result = await unlockVault(target, 'not-the-passphrase')

      expect(result.status).toBe('wrong-passphrase')
      expect(webdav.setProperties).not.toHaveBeenCalled()
    })

    it('rejects a wrong passphrase that slips past the name check', async () => {
      // `verifySegment` has no authentication tag, and this exact passphrase is a
      // known false accept against this exact name. Content decryption is what
      // catches it - without that, we would write a token for the wrong passphrase
      // and lock the real one out permanently.
      const { target, webdav } = await createTarget({ children: [{ name: encryptedChildName }] })
      const engine = createEngine(vaultRoot, 'definitely-wrong')
      expect(await engine.verifySegment(encryptedChildName)).toBe(true)

      const result = await unlockVault(target, 'definitely-wrong')

      expect(result.status).toBe('wrong-passphrase')
      expect(webdav.setProperties).not.toHaveBeenCalled()
    })

    it('unlocks without a token when there is no authenticated content', async () => {
      // Only folders and an empty file. A 32-byte rclone-crypt file is a bare
      // header sealing no blocks, so *any* key "decrypts" it - it proves nothing,
      // and must not be treated as evidence worth committing a token from.
      const { target, webdav } = await createTarget({
        children: [
          { name: encryptedChildName, isFolder: true },
          { name: 'kj4hg2mnb5vcx8qwe7rty1uiop', size: 32 }
        ]
      })

      const result = await unlockVault(target, passphrase)

      expect(result.status).toBe('unlocked')
      expect(webdav.getFileContents).not.toHaveBeenCalled()
      expect(webdav.setProperties).not.toHaveBeenCalled()
    })

    it('samples the smallest file that actually seals a block', async () => {
      // First child carries the real ciphertext so the cheap name check passes;
      // the sampled file should still be the smallest one above the bare header.
      const { target, webdav, space } = await createTarget({
        children: [
          { name: encryptedChildName, size: 900 },
          { name: 'empty-file', size: 32 },
          { name: 'smallest-sealed', size: 200 }
        ]
      })

      await unlockVault(target, passphrase)

      // Fetched by fileId, not path: that makes the webdav decorator hand back raw
      // ciphertext regardless of whether the vault happens to be unlocked already.
      expect(webdav.getFileContents).toHaveBeenCalledWith(
        space,
        { fileId: 'id-smallest-sealed' },
        { responseType: 'arraybuffer', headers: { Range: 'bytes=0-65583' } }
      )
    })

    it('only downloads the header and the first sealed block', async () => {
      // A vault whose smallest file is huge must not pull the whole thing into
      // memory - one block authenticates just as well as a thousand.
      const { target, webdav } = await createTarget({
        children: [{ name: encryptedChildName, size: 8 * 1024 * 1024 * 1024 }]
      })

      await unlockVault(target, passphrase)

      // 32-byte file header + one 64 KiB block + its 16-byte Poly1305 tag.
      expect(webdav.getFileContents).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ headers: { Range: `bytes=0-${32 + 16 + 64 * 1024 - 1}` } })
      )
    })

    it('lists the children by fileId', async () => {
      // The webdav decorator keys its name decryption off the path, so a listing
      // by path comes back with cleartext names once this session has the vault
      // unlocked - and the encrypted name is what the checks here need. A fileId
      // listing carries no vault path for the decorator to claim.
      const { target, webdav, space } = await createTarget({
        children: [{ name: encryptedChildName }]
      })

      await unlockVault(target, passphrase)

      expect(webdav.listFiles).toHaveBeenCalledWith(space, { fileId: 'id-root' })
    })

    it('throws on a fetch failure rather than blaming the passphrase', async () => {
      const { target, webdav } = await createTarget({ children: [{ name: encryptedChildName }] })
      webdav.getFileContents.mockRejectedValue(new Error('network'))

      await expect(unlockVault(target, passphrase)).rejects.toThrow('network')
      expect(webdav.setProperties).not.toHaveBeenCalled()
    })

    it('still unlocks when the backfill is rejected', async () => {
      // A viewer on a shared vault or a public-link visitor cannot write
      // properties. The passphrase is verified by then, so keep them in.
      const { target, webdav } = await createTarget({ children: [{ name: encryptedChildName }] })
      webdav.setProperties.mockRejectedValue(new Error('403'))

      const result = await unlockVault(target, passphrase)

      expect(result.status).toBe('unlocked')
    })
  })

  describe('a brand new vault', () => {
    it('commits the passphrase by writing a token, then unlocks', async () => {
      const { target, webdav } = await createTarget()

      const result = await unlockVault(target, passphrase)

      expect(result.status).toBe('unlocked')
      const engine = createEngine(vaultRoot, passphrase)
      expect(await engine.verifyIntegrityToken(writtenToken(webdav))).toBe(true)
    })

    it('throws when the token cannot be written', async () => {
      // Unlocking without a stored token would leave the passphrase uncommitted,
      // which is the very confusion this is meant to end.
      const { target, webdav } = await createTarget()
      webdav.setProperties.mockRejectedValue(new Error('403'))

      await expect(unlockVault(target, passphrase)).rejects.toThrow('403')
    })
  })
})

describe('probeVaultNeedsSetup', () => {
  it('asks to unlock rather than to set up when a token exists, even for an empty vault', async () => {
    // The regression this token exists for: an empty vault used to re-offer
    // "Set Up Encrypted Vault" and silently accept a different passphrase.
    const { target, webdav } = await createTarget({
      token: await tokenFor(passphrase),
      children: []
    })

    expect(await probeVaultNeedsSetup(target)).toBe(false)
    expect(webdav.listFiles).not.toHaveBeenCalled()
  })

  it('asks to unlock for a vault holding content but no token', async () => {
    const { target } = await createTarget({ children: [{ name: encryptedChildName }] })

    expect(await probeVaultNeedsSetup(target)).toBe(false)
  })

  it('asks to set up for an empty vault without a token', async () => {
    const { target } = await createTarget()

    expect(await probeVaultNeedsSetup(target)).toBe(true)
  })
})
