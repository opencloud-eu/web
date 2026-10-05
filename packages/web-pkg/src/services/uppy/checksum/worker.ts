import { createSHA1 } from 'hash-wasm'
import { sha1 } from 'js-sha1'
import type { ChecksumWorkerRequest, ChecksumWorkerResponse } from './sha1'

type Hasher = {
  update(data: Uint8Array): void
  hex(): string
}

function post(message: ChecksumWorkerResponse) {
  postMessage(message)
}

// hash-wasm is several times faster, but compiling WebAssembly needs 'wasm-unsafe-eval' in the
// Content-Security-Policy's script-src. Without it, compiling throws before any data is hashed,
// and the pure JavaScript implementation is used instead. Both produce the same SHA1.
async function createHasher(): Promise<Hasher> {
  try {
    const hasher = await createSHA1()
    hasher.init()
    return { update: (data) => hasher.update(data), hex: () => hasher.digest('hex') }
  } catch (error) {
    console.info(
      `[UploadChecksum] WebAssembly is not available (${error instanceof Error ? error.message : error}), using the slower JavaScript SHA1`
    )
    const hasher = sha1.create()
    return { update: (data) => hasher.update(data), hex: () => hasher.hex() }
  }
}

// Hashes the blob slice by slice, so that large files never have to be loaded into memory
// at once. crypto.subtle.digest cannot hash incrementally.
self.onmessage = async (e: MessageEvent<ChecksumWorkerRequest>) => {
  const { blob, chunkSize } = e.data
  try {
    const hasher = await createHasher()
    for (let offset = 0; offset < blob.size; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, blob.size)
      hasher.update(new Uint8Array(await blob.slice(offset, end).arrayBuffer()))
      post({ type: 'progress', bytesHashed: end })
    }
    post({ type: 'done', checksum: hasher.hex() })
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}
