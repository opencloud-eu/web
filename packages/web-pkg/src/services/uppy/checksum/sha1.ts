import ChecksumWorker from './worker?worker'

export const CHECKSUM_CHUNK_SIZE = 8 * 1024 * 1024

export type ChecksumWorkerRequest = {
  blob: Blob
  chunkSize: number
}

export type ChecksumWorkerResponse =
  | { type: 'progress'; bytesHashed: number }
  | { type: 'done'; checksum: string }
  | { type: 'error'; message: string }

/**
 * Computes the hex encoded SHA1 of a blob in a web worker, so hashing large files does not
 * block the UI.
 */
export function computeSha1(
  blob: Blob,
  {
    chunkSize = CHECKSUM_CHUNK_SIZE,
    onProgress
  }: { chunkSize?: number; onProgress?: (bytesHashed: number) => void } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new (ChecksumWorker as unknown as new () => Worker)()

    worker.onmessage = (e: MessageEvent<ChecksumWorkerResponse>) => {
      const message = e.data
      switch (message.type) {
        case 'progress':
          onProgress?.(message.bytesHashed)
          return
        case 'done':
          worker.terminate()
          resolve(message.checksum)
          return
        case 'error':
          worker.terminate()
          reject(new Error(message.message))
      }
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(new Error(e.message || 'checksum worker failed'))
    }

    worker.postMessage({ blob, chunkSize } satisfies ChecksumWorkerRequest)
  })
}
