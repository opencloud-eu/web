import { encryptVaultPath } from '@opencloud-eu/web-pkg'
import { createEngine } from '../../../src/crypto/engine'
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
