import { Language } from 'vue3-gettext'
import { getAllowedMetaFields } from '@uppy/core/utils'
import type { TusOptions } from '@uppy/tus'
import { OcUppyBody, OcUppyMeta, UppyService } from '../../../../src/services/uppy'

describe('UppyService', () => {
  beforeAll(() => {
    // happy-dom's Blob loses its content when cloned into the emulated checksum worker
    vi.stubEnv('VITEST_WEB_WORKER_CLONE', 'none')
  })
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('puts the checksum but no path information into the tus Upload-Metadata', async () => {
    const uppyService = new UppyService({
      language: { $gettext: (msg: string) => msg } as unknown as Language
    })
    uppyService.useTus({ chunkSize: Infinity, uploadDataDuringCreation: false, headers: {} })
    // the transport itself is not under test (tus-js-client can't send Blobs in node)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const id = uppyService.uppy.addFile({
      name: 'hello.txt',
      data: new Blob(['hello']),
      meta: {
        mtime: 1700000000,
        relativeFolder: 'secret',
        relativePath: '/secret/hello.txt',
        currentFolder: '/private/folder',
        routeDriveAliasAndItem: 'personal/admin/private/folder'
      } as OcUppyMeta
    })
    uppyService.uppy.setFileState(id, { tus: { endpoint: 'https://example.org/dav/spaces/1' } })
    await uppyService.uploadFiles()

    // the Upload-Metadata entries, built the way @uppy/tus builds them
    const { allowedMetaFields } = uppyService.getPlugin('Tus').opts as TusOptions<
      OcUppyMeta,
      OcUppyBody
    >
    const file = uppyService.uppy.getFile(id)
    const metadataKeys = getAllowedMetaFields(
      allowedMetaFields,
      file.meta as unknown as Record<string, unknown>
    )

    expect(file.meta.checksum).toBe('sha1 aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
    expect([...metadataKeys].sort()).toEqual(['checksum', 'mtime', 'name'])
  })
})
