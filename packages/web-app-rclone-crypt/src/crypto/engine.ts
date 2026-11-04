import { Cipher, increment } from '@fyears/rclone-crypt'
import { v4 as uuidV4 } from 'uuid'
import { VaultEngine } from '@opencloud-eu/web-pkg'
import { fromBase64, toBase64 } from '../integrity'

const MAGIC_SIZE = 8
const NONCE_SIZE = 24
const TAG_SIZE = 16
const BLOCK_DATA_SIZE = 64 * 1024

/**
 * An rclone-crypt file is a 32-byte header (magic + nonce) followed by
 * Poly1305-sealed blocks. At exactly 32 bytes there are no blocks, so nothing is
 * authenticated and *any* key "decrypts" it - such a file proves nothing.
 */
export const FILE_HEADER_SIZE = MAGIC_SIZE + NONCE_SIZE

/** One sealed rclone-crypt block: 64 KiB of data plus its 16-byte Poly1305 tag. */
export const BLOCK_SIZE = BLOCK_DATA_SIZE + TAG_SIZE

export function createEngine(vaultRoot: string, password: string): VaultEngine {
  // Derive the cipher once per engine. rclone-crypt's EME filename encryption
  // is deterministic and scrypt key derivation is expensive, but the engine
  // instance is held for the session by the vault store, so a single
  // derivation per unlock is enough - no separate cipher cache needed.
  const cipherPromise = (async () => {
    const cipher = new Cipher('base32')
    // Empty salt makes the cipher fall back to rclone's default salt - matches
    // `rclone config` when no password2 is set.
    await cipher.key(password, '')
    return cipher
  })()

  return {
    vaultRoot,
    // encryptPath/decryptPath work on paths RELATIVE to the vault root (e.g.
    // "sub/x"); the vault root never appears here. rclone-crypt's EME filename
    // encryption is per segment, but that's this engine's private choice - the
    // generic caller (encryptVaultPath) just hands over the whole relative path.
    async encryptPath(relativePath: string): Promise<string> {
      if (!relativePath) {
        return relativePath
      }
      const cipher = await cipherPromise
      return cipher.encryptFileName(relativePath)
    },
    async decryptPath(relativePath: string): Promise<string> {
      if (!relativePath) {
        return relativePath
      }
      const cipher = await cipherPromise
      return cipher.decryptFileName(relativePath)
    },
    async createIntegrityToken(): Promise<string> {
      const cipher = await cipherPromise
      // A random uuid encrypted with the vault's own content cipher, in the very
      // same rclone-crypt file format the vault's files use.
      const ciphertext = await cipher.encryptData(
        new TextEncoder().encode(uuidV4()),
        // nonce omitted → lib generates a fresh random nonce
        undefined
      )
      return toBase64(ciphertext)
    },
    async verifyIntegrityToken(token: string): Promise<boolean> {
      // Each rclone-crypt block carries a Poly1305 tag, so decryptData throws on
      // a wrong key ("failed to authenticate decrypted block"). That makes this a
      // real cryptographic check - no need to inspect the recovered plaintext.
      try {
        const cipher = await cipherPromise
        await cipher.decryptData(fromBase64(token))
        return true
      } catch {
        return false
      }
    },
    async verifySegment(sampleEncryptedSegment: string): Promise<boolean> {
      // EME filename encryption carries no authentication tag, so all we can do
      // is decrypt and see whether the result is plausible: rclone-crypt throws
      // when PKCS#7 unpadding fails, UTF-8 decoding fails, or the segment holds
      // control chars. A wrong passphrase clears all three often enough to
      // matter (roughly 2% for a short name), which is why the integrity token
      // exists and why we backfill one as soon as this check passes.
      try {
        const cipher = await cipherPromise
        const decrypted = await cipher.decryptSegment(sampleEncryptedSegment)
        // additional defensive check: empty result is suspicious
        return decrypted.length > 0
      } catch {
        return false
      }
    },
    encryptContent(plaintext: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
      const blocks = createBlockReader(plaintext)
      const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE))
      let headerSent = false

      return new ReadableStream<Uint8Array>({
        pull(controller) {
          return cancelOnError(blocks, async () => {
            const block = await blocks.read(BLOCK_DATA_SIZE)
            if (headerSent && !block.byteLength) {
              controller.close()
              return
            }
            const cipher = await cipherPromise
            // encryptData emits a one-block file: header + sealed block. It
            // increments the nonce it gets, hence the copy.
            const sealed = await cipher.encryptData(block, nonce.slice())
            // each block uses the file nonce incremented by its index
            increment(nonce)
            controller.enqueue(headerSent ? sealed.subarray(FILE_HEADER_SIZE) : sealed)
            headerSent = true
          })
        },
        cancel(reason) {
          return blocks.cancel(reason)
        }
      })
    },
    decryptContent(encrypted: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
      const blocks = createBlockReader(encrypted)
      let header: Uint8Array | undefined

      return new ReadableStream<Uint8Array>({
        pull(controller) {
          return cancelOnError(blocks, async () => {
            const cipher = await cipherPromise
            if (!header) {
              header = await blocks.read(FILE_HEADER_SIZE)
              // validates length and magic of the header
              await cipher.decryptData(header)
            }
            const block = await blocks.read(BLOCK_SIZE)
            if (!block.byteLength) {
              controller.close()
              return
            }
            // decrypt the block as a one-block file carrying its own nonce
            const file = new Uint8Array(FILE_HEADER_SIZE + block.byteLength)
            file.set(header)
            file.set(block, FILE_HEADER_SIZE)
            controller.enqueue(await cipher.decryptData(file))
            // each block uses the file nonce incremented by its index
            increment(header.subarray(MAGIC_SIZE))
          })
        },
        cancel(reason) {
          return blocks.cancel(reason)
        }
      })
    }
  }
}

/**
 * Reads a byte stream in fixed-size pieces, regardless of how its chunks are cut.
 * `read` returns fewer bytes only at the end of the stream, and an empty array once it is drained.
 */
function createBlockReader(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  let pending: Uint8Array = new Uint8Array(0)
  let drained = false

  return {
    async read(size: number): Promise<Uint8Array> {
      const out = new Uint8Array(size)
      let filled = 0
      while (filled < size) {
        if (!pending.byteLength) {
          if (drained) {
            break
          }
          const { done, value } = await reader.read()
          if (done) {
            drained = true
            break
          }
          pending = value
          continue
        }
        const n = Math.min(size - filled, pending.byteLength)
        out.set(pending.subarray(0, n), filled)
        pending = pending.subarray(n)
        filled += n
      }
      return filled === size ? out : out.subarray(0, filled)
    },
    cancel(reason?: unknown) {
      return reader.cancel(reason)
    }
  }
}

/** Cancels the source when a pull fails, so e.g. a download doesn't keep running after a bad block. */
async function cancelOnError(
  blocks: ReturnType<typeof createBlockReader>,
  pull: () => Promise<void>
): Promise<void> {
  try {
    await pull()
  } catch (err) {
    // rejects if the source itself errored, nothing left to cancel then
    await blocks.cancel(err).catch(() => {})
    throw err
  }
}
