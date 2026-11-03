import { mock } from 'vitest-mock-extended'
import { AxiosError, AxiosInstance, AxiosResponse, CanceledError } from 'axios'
import { GetFileContentsFactory } from '../../../src/webdav/getFileContents'
import { DAV } from '../../../src/webdav/client'
import { SpaceResource } from '../../../src/helpers'
import { HttpError } from '../../../src/errors'
import { WebDavOptions } from '../../../src/webdav/types'

describe('getFileContents', () => {
  it.each([new AxiosError('Network Error', AxiosError.ERR_NETWORK), new CanceledError('canceled')])(
    'rethrows errors without a response as they are',
    async (requestError) => {
      const { getFileContents, axiosClient } = getFactory()
      axiosClient.get.mockRejectedValue(requestError)

      await expect(
        getFileContents(mock<SpaceResource>({ webDavPath: '/spaces/id' }), { path: 'file.txt' })
      ).rejects.toBe(requestError)
    }
  )
  it('throws an HttpError with the status code for errors with a response', async () => {
    const { getFileContents, axiosClient } = getFactory()
    axiosClient.get.mockRejectedValue(
      new AxiosError('Not Found', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
        status: 404
      } as AxiosResponse)
    )

    const error = await getFileContents(mock<SpaceResource>({ webDavPath: '/spaces/id' }), {
      path: 'file.txt'
    }).catch((e) => e)

    expect(error).toBeInstanceOf(HttpError)
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('Not Found')
  })
})

function getFactory() {
  const axiosClient = mock<AxiosInstance>()
  const factory = GetFileContentsFactory(mock<DAV>(), mock<WebDavOptions>({ axiosClient }))
  return { ...factory, axiosClient }
}
