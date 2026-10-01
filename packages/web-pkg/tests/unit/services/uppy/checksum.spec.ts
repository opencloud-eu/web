import { createHash, randomBytes } from 'node:crypto'
import Uppy, { BasePlugin } from '@uppy/core'
import { computeSha1, UploadChecksumPlugin } from '../../../../src/services/uppy/checksum'
import { OcUppyBody, OcUppyMeta } from '../../../../src/services/uppy'

const sha1Hex = (data: Uint8Array) => createHash('sha1').update(data).digest('hex')

// an uploader that records the files it was asked to upload instead of sending them
class RecordingUploader extends BasePlugin<any, OcUppyMeta, OcUppyBody> {
  uploaded: { name: string; meta: OcUppyMeta }[] = []

  constructor(uppy: Uppy<OcUppyMeta, OcUppyBody>) {
    super(uppy, {})
    this.id = 'RecordingUploader'
    this.type = 'uploader'
  }

  upload = (fileIDs: string[]) => {
    for (const file of this.uppy.getFilesByIds(fileIDs)) {
      if (file.error) {
        continue
      }
      this.uploaded.push({ name: file.name, meta: file.meta })
      this.uppy.emit('upload-success', file, { status: 200, body: {}, uploadURL: '' })
    }
    return Promise.resolve()
  }

  install() {
    this.uppy.addUploader(this.upload)
  }

  uninstall() {
    this.uppy.removeUploader(this.upload)
  }
}

const createUppy = () => {
  const uppy = new Uppy<OcUppyMeta, OcUppyBody>()
  uppy.use(UploadChecksumPlugin)
  uppy.use(RecordingUploader)
  return { uppy, uploader: uppy.getPlugin('RecordingUploader') as RecordingUploader }
}

describe('upload checksums', () => {
  // happy-dom's Blob loses its content when structured-cloned into the emulated worker,
  // browsers keep it. Pass messages by reference in these tests.
  beforeAll(() => {
    vi.stubEnv('VITEST_WEB_WORKER_CLONE', 'none')
  })
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  describe('computeSha1', () => {
    it('computes the SHA1 of a blob', async () => {
      expect(await computeSha1(new Blob(['hello']))).toBe(
        'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d'
      )
    })

    it('computes the SHA1 of an empty blob', async () => {
      expect(await computeSha1(new Blob([]))).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
    })

    it('hashes the blob slice by slice', async () => {
      const data = new Uint8Array(randomBytes(3 * 1024 + 17))
      const progress: number[] = []

      const checksum = await computeSha1(new Blob([data]), {
        chunkSize: 1024,
        onProgress: (bytesHashed) => progress.push(bytesHashed)
      })

      expect(checksum).toBe(sha1Hex(data))
      // the emulated worker may deliver a message more than once without cloning
      expect([...new Set(progress)]).toEqual([1024, 2048, 3072, 3 * 1024 + 17])
    })
  })

  describe('UploadChecksumPlugin', () => {
    it('sets the checksum meta field before the upload starts', async () => {
      const { uppy, uploader } = createUppy()
      uppy.addFile({ name: 'hello.txt', data: new Blob(['hello']) })

      const result = await uppy.upload()

      expect(result.failed).toHaveLength(0)
      expect(uploader.uploaded).toHaveLength(1)
      expect(uploader.uploaded[0].meta.checksum).toBe(
        'sha1 aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d'
      )
    })

    it('hashes the data that is actually uploaded', async () => {
      const { uppy, uploader } = createUppy()
      const id = uppy.addFile({ name: 'secret.txt', data: new Blob(['cleartext']) })
      // e.g. a vault upload replaces the content with ciphertext before the upload starts
      uppy.setFileState(id, { data: new Blob(['ciphertext']) })

      await uppy.upload()

      expect(uploader.uploaded[0].meta.checksum).toBe(
        'sha1 ' + sha1Hex(new TextEncoder().encode('ciphertext'))
      )
    })

    it('does not hash folders', async () => {
      const { uppy, uploader } = createUppy()
      uppy.addFile({ name: 'folder', data: new Blob([]), meta: { isFolder: true } as OcUppyMeta })

      await uppy.upload()

      expect(uploader.uploaded[0].meta.checksum).toBeUndefined()
    })

    it('fails the file instead of uploading it without a checksum', async () => {
      const { uppy, uploader } = createUppy()
      // data that cannot be read, so hashing fails
      uppy.addFile({ name: 'broken.txt', data: { size: 6 } as unknown as Blob })
      uppy.addFile({ name: 'fine.txt', data: new Blob(['fine']) })

      const result = await uppy.upload()

      expect(uploader.uploaded.map(({ name }) => name)).toEqual(['fine.txt'])
      expect(result.failed.map(({ name }) => name)).toEqual(['broken.txt'])
    })
  })
})
