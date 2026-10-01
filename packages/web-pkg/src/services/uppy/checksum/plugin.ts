import Uppy, { BasePlugin } from '@uppy/core'
import type { OcUppyBody, OcUppyFile, OcUppyMeta } from '../uppyService'
import { computeSha1 } from './sha1'

/**
 * Uppy pre-processor that computes the SHA1 of every file and stores it in the `checksum` meta
 * field as `sha1 <hex>`, the format the server expects in the tus `Upload-Metadata` header.
 * The server compares it with the checksum of the received bytes and rejects the upload on a
 * mismatch, so a damaged or spliced upload fails instead of being stored.
 *
 * Pre-processors run when the upload starts, after other code (e.g. vault encryption) has
 * replaced `file.data`, so the hash covers the bytes that are actually sent.
 */
export class UploadChecksumPlugin extends BasePlugin<any, OcUppyMeta, OcUppyBody> {
  constructor(uppy: Uppy<OcUppyMeta, OcUppyBody>, opts?: object) {
    super(uppy, opts)
    this.id = 'UploadChecksum'
    this.type = 'modifier'
  }

  prepare = async (fileIDs: string[]) => {
    for (const file of this.uppy.getFilesByIds(fileIDs)) {
      if (!this.needsChecksum(file)) {
        continue
      }

      // file.size may be null while file.data.size is always set for local files
      const size = file.data.size
      this.uppy.emit('preprocess-progress', file, { mode: 'determinate', message: '', value: 0 })
      try {
        const checksum = await computeSha1(file.data as Blob, {
          onProgress: (bytesHashed) => {
            this.uppy.emit('preprocess-progress', this.uppy.getFile(file.id), {
              mode: 'determinate',
              message: '',
              value: size ? bytesHashed / size : 1
            })
          }
        })
        this.uppy.setFileMeta(file.id, {
          ...this.uppy.getFile(file.id).meta,
          checksum: `sha1 ${checksum}`
        })
      } catch (error) {
        // never upload without a checksum, fail this file instead
        this.uppy.log(
          `[UploadChecksum] failed to compute checksum of ${file.name}: ${error}`,
          'error'
        )
        this.uppy.emit(
          'upload-error',
          this.uppy.getFile(file.id),
          error instanceof Error ? error : new Error(String(error))
        )
      }
      this.uppy.emit('preprocess-complete', this.uppy.getFile(file.id))
    }
  }

  private needsChecksum(file: OcUppyFile) {
    // folders have no content, remote files (e.g. from companion) have no local data to hash,
    // and a retried upload keeps the checksum it already has
    return (
      !file.meta.isFolder && !file.isRemote && !file.error && !file.meta.checksum && !!file.data
    )
  }

  install() {
    this.uppy.addPreProcessor(this.prepare)
  }

  uninstall() {
    this.uppy.removePreProcessor(this.prepare)
  }
}
