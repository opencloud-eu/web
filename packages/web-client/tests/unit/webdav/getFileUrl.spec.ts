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
