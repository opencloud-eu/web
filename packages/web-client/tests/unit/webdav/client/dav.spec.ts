import { createClient, WebDAVClient } from 'webdav'
import { mock } from 'vitest-mock-extended'
import { DAV } from '../../../../src/webdav/client/dav'

vi.mock('webdav', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  createClient: vi.fn()
}))

describe('DAV', () => {
  describe('withCredentials', () => {
    it.each([true, false])('is passed to requests if the callback returns %s', async (value) => {
      const { dav, customRequest } = getDav(() => value)

      await dav.delete('/some/path')

      expect(customRequest.mock.calls[0][1].withCredentials).toBe(value || undefined)
    })
    it('is not passed to requests without a callback', async () => {
      const { dav, customRequest } = getDav()

      await dav.delete('/some/path')

      expect(customRequest.mock.calls[0][1].withCredentials).toBeUndefined()
    })
  })
})

function getDav(withCredentials?: () => boolean) {
  const customRequest = vi.fn().mockResolvedValue({ status: 204 })
  vi.mocked(createClient).mockReturnValue(mock<WebDAVClient>({ customRequest }))
  const dav = new DAV({ baseUrl: 'https://localhost', withCredentials })
  return { dav, customRequest }
}
