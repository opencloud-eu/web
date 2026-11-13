import { mock } from 'vitest-mock-extended'
import { GetFileUrlFactory } from '../../../src/webdav/getFileUrl'
import { GetFileContentsFactory } from '../../../src/webdav/getFileContents'
import { GetFileInfoFactory } from '../../../src/webdav/getFileInfo'
import { DAV } from '../../../src/webdav/client'
import { Resource, SpaceResource } from '../../../src/helpers'
import { WebDavOptions } from '../../../src/webdav/types'

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
})
