import { Cipher, encryptedSize } from '@fyears/rclone-crypt'
import { encryptVaultPath } from '@opencloud-eu/web-pkg'
import { createEngine, FILE_HEADER_SIZE } from '../../../src/crypto/engine'
import { fromBase64 } from '../../../src/integrity'

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.byteLength
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

function streamOf(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(c))
      controller.close()
    }
  })
}

const BLOCK = 64 * 1024

function randomBytes(size: number): Uint8Array {
  const out = new Uint8Array(size)
  // getRandomValues is capped at 64 KiB per call
  for (let offset = 0; offset < size; offset += BLOCK) {
    crypto.getRandomValues(out.subarray(offset, offset + BLOCK))
  }
  return out
}

// yields one chunk per pull, so the source is still open when the engine cancels it
function pullSourceOf(
  chunks: Uint8Array[],
  onCancel: (reason: unknown) => void
): ReadableStream<Uint8Array> {
  let index = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index++])
        return
      }
      controller.close()
    },
    cancel: onCancel
  })
}

function cut(bytes: Uint8Array, size: number): Uint8Array[] {
  const chunks: Uint8Array[] = []
  for (let offset = 0; offset < bytes.byteLength; offset += size) {
    chunks.push(bytes.subarray(offset, offset + size))
  }
  return chunks
}

async function libCipher(): Promise<Cipher> {
  const cipher = new Cipher('base32')
  await cipher.key('foobar', '')
  return cipher
}

describe('rclone-crypt engine', () => {
  // Password "foobar" with rclone's default salt (no password2). The expected
  // ciphertexts below are the exact deterministic EME output rclone itself
  // produces, so these assertions also cross-check our engine against the real
  // `rclone` CLI that builds the e2e fixtures.
  // vaultRoot is identity only; the engine encrypts paths RELATIVE to it. The
  // vault-root <-> full-path conversion is the generic encryptVaultPath helper.
  const engine = createEngine('/my.vault', 'foobar')

  it('encrypts a vault-relative path to the exact rclone ciphertext and round-trips it', async () => {
    const relative = 'sub folder/hello world.txt'
    const encrypted = await engine.encryptPath(relative)

    expect(encrypted).toBe('4f01ckg2opc25l0dphfcs9n77k/rpds02g0ofv53k48ai1jcthsks')
    expect(await engine.decryptPath(encrypted)).toBe(relative)
  })

  it('encrypts a bare name (a one-segment path) to the exact rclone ciphertext and round-trips it', async () => {
    const encrypted = await engine.encryptPath('report.txt')

    expect(encrypted).toBe('unq54c7b9fj4lam8t82q1hofdo')
    expect(await engine.decryptPath(encrypted)).toBe('report.txt')
  })

  it('composes with encryptVaultPath on a full path (ties the whole stack to the rclone CLI vector)', async () => {
    expect(await encryptVaultPath(engine, '/my.vault/sub folder/hello world.txt')).toBe(
      '/my.vault/4f01ckg2opc25l0dphfcs9n77k/rpds02g0ofv53k48ai1jcthsks'
    )
  })

  describe('content encryption', () => {
    it('round-trips file content through encrypt then decrypt', async () => {
      const plain = new TextEncoder().encode('hello vault world')
      const ciphertext = await collect(engine.encryptContent(streamOf(plain)))

      // the stored bytes must differ from the plaintext and carry the header
      expect(ciphertext.byteLength).toBeGreaterThan(plain.byteLength)
      expect(Array.from(ciphertext)).not.toEqual(Array.from(plain))

      const back = await collect(engine.decryptContent(streamOf(ciphertext)))
      expect(new TextDecoder().decode(back)).toBe('hello vault world')
    })

    it('turns empty content into a valid header blob that decrypts back to empty', async () => {
      // The decorator relies on this: an empty PUT still has to become a real
      // rclone-crypt blob (header bytes), or it cannot be decrypted later.
      const ciphertext = await collect(engine.encryptContent(streamOf(new Uint8Array(0))))
      expect(ciphertext.byteLength).toBeGreaterThan(0)

      const back = await collect(engine.decryptContent(streamOf(ciphertext)))
      expect(back.byteLength).toBe(0)
    })

    it('reassembles content delivered as multiple input chunks', async () => {
      const a = new TextEncoder().encode('chunk-one-')
      const b = new TextEncoder().encode('chunk-two')
      const ciphertext = await collect(engine.encryptContent(streamOf(a, b)))

      const back = await collect(engine.decryptContent(streamOf(ciphertext)))
      expect(new TextDecoder().decode(back)).toBe('chunk-one-chunk-two')
    })

    it.each([
      ['spanning several blocks with a partial last one', 3 * BLOCK + 123],
      ['of an exact multiple of the block size', 2 * BLOCK]
    ])('round-trips content %s, cut into odd chunks', async (_, size) => {
      const plain = randomBytes(size)
      const ciphertext = await collect(engine.encryptContent(streamOf(...cut(plain, 7777))))
      expect(ciphertext.byteLength).toBe(encryptedSize(size))

      const back = await collect(engine.decryptContent(streamOf(...cut(ciphertext, 5555))))
      expect(back).toEqual(plain)
    })

    it('writes the exact rclone-crypt file format', async () => {
      const plain = randomBytes(2 * BLOCK + 42)
      const ciphertext = await collect(engine.encryptContent(streamOf(plain)))

      expect(await (await libCipher()).decryptData(ciphertext)).toEqual(plain)
    })

    it('reads the exact rclone-crypt file format', async () => {
      const plain = randomBytes(2 * BLOCK + 42)
      const ciphertext = await (await libCipher()).encryptData(plain, undefined)

      expect(await collect(engine.decryptContent(streamOf(ciphertext)))).toEqual(plain)
    })

    it('emits ciphertext before the whole input has been read', async () => {
      let pulled = 0
      const source = new ReadableStream<Uint8Array>({
        pull(controller) {
          pulled++
          controller.enqueue(new Uint8Array(BLOCK))
          if (pulled === 100) {
            controller.close()
          }
        }
      })

      const { value } = await engine.encryptContent(source).getReader().read()

      expect(value.byteLength).toBe(encryptedSize(BLOCK))
      expect(pulled).toBeLessThan(5)
    })

    it('rejects a tampered block', async () => {
      const ciphertext = await collect(engine.encryptContent(streamOf(randomBytes(2 * BLOCK))))
      ciphertext[ciphertext.byteLength - 1] ^= 1

      await expect(collect(engine.decryptContent(streamOf(ciphertext)))).rejects.toThrow(
        'invalid tag'
      )
    })

    it('rejects content without a valid header', async () => {
      await expect(collect(engine.decryptContent(streamOf(new Uint8Array(10))))).rejects.toThrow(
        'too short'
      )
      await expect(collect(engine.decryptContent(streamOf(new Uint8Array(64))))).rejects.toThrow(
        'bad magic'
      )
    })

    it('rejects content with a truncated block', async () => {
      const ciphertext = await collect(engine.encryptContent(streamOf(randomBytes(100))))

      await expect(
        collect(engine.decryptContent(streamOf(ciphertext.subarray(0, FILE_HEADER_SIZE + 10))))
      ).rejects.toThrow('truncated block header')
    })

    it('cancels the source when a block fails to decrypt', async () => {
      const ciphertext = await collect(engine.encryptContent(streamOf(randomBytes(4 * BLOCK))))
      ciphertext[FILE_HEADER_SIZE] ^= 1
      const onCancel = vi.fn()

      await expect(
        collect(engine.decryptContent(pullSourceOf(cut(ciphertext, BLOCK), onCancel)))
      ).rejects.toThrow('invalid tag')
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it.each(['encryptContent', 'decryptContent'] as const)(
      'passes a cancel of the %s output on to the source',
      async (method) => {
        const onCancel = vi.fn()

        await engine[method](pullSourceOf([new Uint8Array(BLOCK)], onCancel)).cancel('stop')

        expect(onCancel).toHaveBeenCalledWith('stop')
      }
    )
  })

  describe('verifySegment', () => {
    it('accepts a sample segment that decrypts under the engine key', async () => {
      expect(await engine.verifySegment('unq54c7b9fj4lam8t82q1hofdo')).toBe(true)
    })

    it('rejects a sample segment that belongs to a different password', async () => {
      const wrong = createEngine('/my.vault', 'not-the-passphrase')
      expect(await wrong.verifySegment('unq54c7b9fj4lam8t82q1hofdo')).toBe(false)
    })

    it('rejects a segment that is not valid ciphertext at all', async () => {
      expect(await engine.verifySegment('!!! not base32 !!!')).toBe(false)
    })
  })

  describe('integrity token', () => {
    it('verifies a token it minted itself', async () => {
      expect(await engine.verifyIntegrityToken(await engine.createIntegrityToken())).toBe(true)
    })

    it('rejects a token minted under a different passphrase', async () => {
      const wrong = createEngine('/my.vault', 'not-the-passphrase')

      expect(await wrong.verifyIntegrityToken(await engine.createIntegrityToken())).toBe(false)
      expect(await engine.verifyIntegrityToken(await wrong.createIntegrityToken())).toBe(false)
    })

    it('rejects garbage, truncated and non-base64 tokens', async () => {
      const token = await engine.createIntegrityToken()

      expect(await engine.verifyIntegrityToken('')).toBe(false)
      expect(await engine.verifyIntegrityToken('!!! not base64 !!!')).toBe(false)
      // A truncated token loses the Poly1305 tag, so authentication has to fail.
      expect(await engine.verifyIntegrityToken(token.slice(0, 20))).toBe(false)
    })

    it('mints a different token on every call', async () => {
      // A fresh random nonce per token, so the property never leaks whether two
      // vaults share a passphrase.
      const [first, second] = await Promise.all([
        engine.createIntegrityToken(),
        engine.createIntegrityToken()
      ])

      expect(first).not.toBe(second)
      expect(await engine.verifyIntegrityToken(first)).toBe(true)
      expect(await engine.verifyIntegrityToken(second)).toBe(true)
    })

    it('carries a uuid as its plaintext', async () => {
      const token = await engine.createIntegrityToken()
      const plaintext = new TextDecoder().decode(
        await collect(engine.decryptContent(streamOf(fromBase64(token))))
      )

      expect(plaintext).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      )
    })
  })
})
