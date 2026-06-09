import { Cipher } from '@fyears/rclone-crypt'
import { FolderVaultEngine } from '@opencloud-eu/web-pkg'

export function createEngine(vaultRoot: string, password: string): FolderVaultEngine {
  // Derive the cipher once per engine. rclone-crypt's EME filename encryption
  // is deterministic and scrypt key derivation is expensive, but the engine
  // instance is held for the session by the folder-vault store, so a single
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
    async verifyKey(sampleEncryptedSegment: string): Promise<boolean> {
      // rclone-crypt throws on bad password (PKCS#7 unpad fails, UTF-8 decode
      // fails, or the decoded segment contains control chars). Treat any
      // throw as "key doesn't match".
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
      // TODO(vault): mirrors decryptContent - buffer the whole input,
      // call cipher.encryptData, emit one chunk. Same upgrade path applies.
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const reader = plaintext.getReader()
            const chunks: Uint8Array[] = []
            let total = 0

            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              chunks.push(value)
              total += value.byteLength
            }
            const combined = new Uint8Array(total)
            let offset = 0
            for (const chunk of chunks) {
              combined.set(chunk, offset)
              offset += chunk.byteLength
            }
            const cipher = await cipherPromise
            // nonce omitted → lib generates a fresh random nonce per file
            const ciphertext = await cipher.encryptData(combined, undefined)
            controller.enqueue(ciphertext)
            controller.close()
          } catch (e) {
            controller.error(e)
          }
        }
      })
    },
    decryptContent(encrypted: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
      // TODO(vault): @fyears/rclone-crypt's `decryptData` operates on a
      // single Uint8Array, so we buffer the whole input before decrypting and
      // emit one chunk on the output. The rclone-crypt format itself is
      // chunked (64 KiB blocks + per-block nonce + a 32-byte file header), so
      // a future implementation - either an upstream stream API or a
      // hand-rolled one over the salsa primitives - can swap this body for a
      // pipe that decrypts block-by-block without breaking callers.
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const reader = encrypted.getReader()
            const chunks: Uint8Array[] = []
            let total = 0
            // collect entire ciphertext

            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              chunks.push(value)
              total += value.byteLength
            }
            const combined = new Uint8Array(total)
            let offset = 0
            for (const chunk of chunks) {
              combined.set(chunk, offset)
              offset += chunk.byteLength
            }
            const cipher = await cipherPromise
            const plaintext = await cipher.decryptData(combined)
            controller.enqueue(plaintext)
            controller.close()
          } catch (e) {
            controller.error(e)
          }
        }
      })
    }
  }
}
