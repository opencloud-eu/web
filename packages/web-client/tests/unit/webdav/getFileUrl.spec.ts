import { mock } from 'vitest-mock-extended'
import { GetFileUrlFactory } from '../../../src/webdav/getFileUrl'
import { GetFileContentsFactory } from '../../../src/webdav/getFileContents'
import { GetFileInfoFactory } from '../../../src/webdav/getFileInfo'
import { DAV } from '../../../src/webdav/client'
import { Resource, SpaceResource } from '../../../src/helpers'
import { WebDavOptions } from '../../../src/webdav/types'
import { ocs, OCS } from '../../../src/ocs'

vi.mock('../../../src/ocs')

describe('getFileUrl', () => {
  describe('inline', () => {
    function setup(body: Blob) {
      const getFileContentsFactory = mock<ReturnType<typeof GetFileContentsFactory>>()
      getFileContentsFactory.getFileContents.mockResolvedValue({ body } as any)
      const createObjectURL = vi.fn().mockReturnValue('blob:url')
      vi.stubGlobal('URL', { createObjectURL })
      const { getFileUrl } = GetFileUrlFactory(
        mock<DAV>(),
        getFileContentsFactory,
        mock<ReturnType<typeof GetFileInfoFactory>>(),
        mock<WebDavOptions>()
      )
      return { getFileUrl, createObjectURL }
    }

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('keeps the type the server sent if no mime type is given', async () => {
      const body = new Blob(['<html />'], { type: 'text/html' })
      const { getFileUrl, createObjectURL } = setup(body)

      await getFileUrl(mock<SpaceResource>(), mock<Resource>(), { disposition: 'inline' })

      expect(createObjectURL).toHaveBeenCalledWith(body)
    })

    it('overrides the type the server sent with the given mime type', async () => {
      const { getFileUrl, createObjectURL } = setup(new Blob(['<html />'], { type: 'text/html' }))

      await getFileUrl(mock<SpaceResource>(), mock<Resource>(), {
        disposition: 'inline',
        mimeType: 'application/pdf'
      })

      const blob: Blob = createObjectURL.mock.calls[0][0]
      expect(blob.type).toBe('application/pdf')
      expect(await blob.text()).toBe('<html />')
    })
  })

  describe('with a version', () => {
    it('signs the meta url by default', async () => {
      const signUrl = vi.fn().mockResolvedValue('signed-url')
      vi.mocked(ocs).mockReturnValue(mock<OCS>({ signUrl }))
      const dav = mock<DAV>()
      dav.getFileUrl.mockReturnValue('https://server.example/dav/meta/file-id/v/v1')
      const { getFileUrl } = GetFileUrlFactory(
        dav,
        mock<ReturnType<typeof GetFileContentsFactory>>(),
        mock<ReturnType<typeof GetFileInfoFactory>>(),
        mock<WebDavOptions>()
      )

      const url = await getFileUrl(mock<SpaceResource>(), mock<Resource>({ fileId: 'file-id' }), {
        version: 'v1',
        username: 'admin'
      })

      expect(signUrl).toHaveBeenCalledWith('https://server.example/dav/meta/file-id/v/v1', 'admin')
      expect(url).toBe('signed-url')
    })

    it('returns the unsigned meta url if signing is disabled', async () => {
      const dav = mock<DAV>()
      dav.getFileUrl.mockReturnValue('https://server.example/dav/meta/file-id/v/v1')
      const { getFileUrl } = GetFileUrlFactory(
        dav,
        mock<ReturnType<typeof GetFileContentsFactory>>(),
        mock<ReturnType<typeof GetFileInfoFactory>>(),
        mock<WebDavOptions>()
      )

      const url = await getFileUrl(mock<SpaceResource>(), mock<Resource>({ fileId: 'file-id' }), {
        version: 'v1',
        signUrl: false
      })

      expect(dav.getFileUrl).toHaveBeenCalledWith('/meta/file-id/v/v1')
      expect(url).toBe('https://server.example/dav/meta/file-id/v/v1')
    })

    it('throws if signing is enabled but no username is given', async () => {
      const { getFileUrl } = GetFileUrlFactory(
        mock<DAV>(),
        mock<ReturnType<typeof GetFileContentsFactory>>(),
        mock<ReturnType<typeof GetFileInfoFactory>>(),
        mock<WebDavOptions>()
      )

      await expect(
        getFileUrl(mock<SpaceResource>(), mock<Resource>({ fileId: 'file-id' }), { version: 'v1' })
      ).rejects.toThrow('username is required for URL signing')
    })
  })
})
