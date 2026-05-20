import { Cipher } from '@fyears/rclone-crypt'
import { FolderVaultEngine } from '@opencloud-eu/web-pkg'

// rclone-crypt's filename encryption (EME) is deterministic, so once the key
// is derived we keep one Cipher instance per (space, vault, password) tuple.
// Key derivation (scrypt) is expensive; the cache avoids re-running it on
// every folder listing.
const cipherCache = new Map<string, Promise<Cipher>>()

function cacheKey(spaceId: string, vaultRoot: string, password: string): string {
  return `${spaceId}::${vaultRoot}::${password}`
}

async function getCipher(
  spaceId: string,
  vaultRoot: string,
  password: string
): Promise<Cipher> {
  const key = cacheKey(spaceId, vaultRoot, password)
  let cipherPromise = cipherCache.get(key)
  if (!cipherPromise) {
    cipherPromise = (async () => {
      const cipher = new Cipher('base32')
      // Empty salt makes the cipher fall back to rclone's default salt — this
      // matches the behaviour of `rclone config` when no password2 is set.
      await cipher.key(password, '')
      return cipher
    })()
    cipherCache.set(key, cipherPromise)
  }
  return cipherPromise
}

function vaultRelative(vaultRoot: string, fullPath: string): string {
  if (!fullPath.startsWith(vaultRoot)) {
    return ''
  }
  return fullPath.slice(vaultRoot.length).replace(/^\/+/, '').replace(/\/+$/, '')
}

function joinUnderVault(vaultRoot: string, relative: string): string {
  if (!relative) {
    return vaultRoot
  }
  return `${vaultRoot}/${relative}`
}

export function createEngine(
  spaceId: string,
  vaultRoot: string,
  password: string
): FolderVaultEngine {
  const cipherPromise = getCipher(spaceId, vaultRoot, password)

  return {
    vaultRoot,
    isLocked: () => false,
    async encryptPath(clearPath: string): Promise<string> {
      if (!clearPath.startsWith(vaultRoot)) {
        // Path is outside our vault — leave it untouched. Returning the vault
        // root here would silently rewrite unrelated resources onto the vault.
        return clearPath
      }
      const relative = vaultRelative(vaultRoot, clearPath)
      if (!relative) {
        return vaultRoot
      }
      const cipher = await cipherPromise
      const encrypted = await cipher.encryptFileName(relative)
      return joinUnderVault(vaultRoot, encrypted)
    },
    async decryptPath(encryptedPath: string): Promise<string> {
      if (!encryptedPath.startsWith(vaultRoot)) {
        return encryptedPath
      }
      const relative = vaultRelative(vaultRoot, encryptedPath)
      if (!relative) {
        return vaultRoot
      }
      const cipher = await cipherPromise
      const decrypted = await cipher.decryptFileName(relative)
      return joinUnderVault(vaultRoot, decrypted)
    },
    async decryptName(encryptedSegment: string, _parentClearPath: string): Promise<string> {
      if (!encryptedSegment) {
        return encryptedSegment
      }
      const cipher = await cipherPromise
      return cipher.decryptSegment(encryptedSegment)
    },
    async encryptName(clearSegment: string, _parentClearPath: string): Promise<string> {
      if (!clearSegment) {
        return clearSegment
      }
      const cipher = await cipherPromise
      return cipher.encryptSegment(clearSegment)
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
      // FIXME(poc-vault): mirrors decryptContent — buffer the whole input,
      // call cipher.encryptData, emit one chunk. Same upgrade path applies.
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const reader = plaintext.getReader()
            const chunks: Uint8Array[] = []
            let total = 0
            // eslint-disable-next-line no-constant-condition
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
      // FIXME(poc-vault): @fyears/rclone-crypt's `decryptData` operates on a
      // single Uint8Array, so we buffer the whole input before decrypting and
      // emit one chunk on the output. The rclone-crypt format itself is
      // chunked (64 KiB blocks + per-block nonce + a 32-byte file header), so
      // a future implementation — either an upstream stream API or a
      // hand-rolled one over the salsa primitives — can swap this body for a
      // pipe that decrypts block-by-block without breaking callers.
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const reader = encrypted.getReader()
            const chunks: Uint8Array[] = []
            let total = 0
            // collect entire ciphertext
            // eslint-disable-next-line no-constant-condition
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
