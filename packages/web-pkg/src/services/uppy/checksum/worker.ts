import { createSHA1 } from 'hash-wasm'
import type { ChecksumWorkerRequest, ChecksumWorkerResponse } from './sha1'

function post(message: ChecksumWorkerResponse) {
  postMessage(message)
}

// Hashes the blob slice by slice, so that large files never have to be loaded into memory
// at once. crypto.subtle.digest cannot hash incrementally, so hash-wasm is used instead.
self.onmessage = async (e: MessageEvent<ChecksumWorkerRequest>) => {
  const { blob, chunkSize } = e.data
  try {
    const hasher = await createSHA1()
    hasher.init()
    for (let offset = 0; offset < blob.size; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, blob.size)
      hasher.update(new Uint8Array(await blob.slice(offset, end).arrayBuffer()))
      post({ type: 'progress', bytesHashed: end })
    }
    post({ type: 'done', checksum: hasher.digest('hex') })
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}
