import { mock } from 'vitest-mock-extended'
import { XHRUploadOptions } from '@uppy/xhr-upload'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useUpload } from '../../../../src/composables/upload'
import { CapabilityStore } from '../../../../src/composables'
import { OcUppyBody, OcUppyFile, OcUppyMeta, UppyService } from '../../../../src/services/uppy'

describe('useUpload', () => {
  it('should be valid', () => {
    expect(useUpload).toBeDefined()
  })

  describe('plain PUT uploads', () => {
    it('send the checksum as OC-Checksum header', () => {
      const headers = getXhrHeaders({
        meta: { checksum: 'sha1 aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d' }
      } as OcUppyFile)
      expect(headers['OC-Checksum']).toBe('SHA1:aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
    })

    it('send no OC-Checksum header without a checksum', () => {
      const headers = getXhrHeaders({ meta: {} } as OcUppyFile)
      expect(headers).not.toHaveProperty('OC-Checksum')
    })
  })
})

function getXhrHeaders(file: OcUppyFile) {
  const uppyService = mock<UppyService>()
  const mocks = defaultComponentMocks()
  // a max chunk size of 0 means no tus support, so the plain PUT (XHR) uploader is used
  const capabilities = {
    files: { tus_support: { max_chunk_size: 0, extension: '' } }
  } as unknown as Partial<CapabilityStore['capabilities']>

  getComposableWrapper(() => useUpload({ uppyService }), {
    mocks,
    provide: mocks,
    pluginOptions: { piniaOptions: { capabilityState: { capabilities } } }
  })

  const options = uppyService.useXhr.mock.calls[0][0] as XHRUploadOptions<OcUppyMeta, OcUppyBody>
  return (options.headers as (file: OcUppyFile) => Record<string, string>)(file)
}
