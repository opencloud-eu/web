import { AxiosInstance } from 'axios'
import { mock } from 'vitest-mock-extended'
import { UrlSign } from '../../../src/ocs/urlSign'

const signingKeyResponse = `<?xml version="1.0" encoding="UTF-8"?>
<ocs><meta><status>ok</status></meta><data><signing-key>signing-key</signing-key></data></ocs>`

describe('UrlSign', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('signs the url with a PBKDF2-SHA512 signature the server accepts', async () => {
    const axiosClient = mock<AxiosInstance>()
    axiosClient.get.mockResolvedValue({ data: signingKeyResponse })
    const urlSign = new UrlSign({ axiosClient, baseURI: 'https://localhost:9200' })

    const signedUrl = new URL(
      await urlSign.signUrl('https://localhost:9200/remote.php/dav/spaces/1/file.txt', 'admin')
    )

    expect(axiosClient.get).toHaveBeenCalledWith(
      'https://localhost:9200/ocs/v1.php/cloud/user/signing-key',
      expect.anything()
    )
    expect(Object.fromEntries(signedUrl.searchParams)).toEqual({
      'OC-Credential': 'admin',
      'OC-Date': '2026-01-01T00:00:00.000Z',
      'OC-Expires': '1200',
      'OC-Verb': 'GET',
      'OC-Algo': 'PBKDF2/10000-SHA512',
      'OC-Signature': 'c7c3094e7e871cb0307d098b15c7c9db10837417cb6276dee127b99d0cad16b7'
    })
  })

  it('fetches the signing key only once', async () => {
    const axiosClient = mock<AxiosInstance>()
    axiosClient.get.mockResolvedValue({ data: signingKeyResponse })
    const urlSign = new UrlSign({ axiosClient, baseURI: 'https://localhost:9200' })

    await urlSign.signUrl('https://localhost:9200/a.txt', 'admin')
    await urlSign.signUrl('https://localhost:9200/b.txt', 'admin')

    expect(axiosClient.get).toHaveBeenCalledTimes(1)
  })
})
