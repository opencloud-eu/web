import { AxiosInstance } from 'axios'
import { mock } from 'vitest-mock-extended'
import { ox } from '../../../src/ox'

const apiUrl = 'https://ox.example.com/api'

const getClient = (apiUrlValue = apiUrl) => {
  const axiosClient = mock<AxiosInstance>()
  const client = ox(axiosClient, () => apiUrlValue)
  return { client, axiosClient }
}

describe('ox client', () => {
  describe('autocompleteContacts', () => {
    it('returns an empty list without calling the api when no api url is configured', async () => {
      const { client, axiosClient } = getClient('')
      const result = await client.autocompleteContacts({ query: 'jane' })
      expect(result).toEqual([])
      expect(axiosClient.get).not.toHaveBeenCalled()
    })

    it('requests the autocomplete endpoint with the expected url and params', async () => {
      const { client, axiosClient } = getClient()
      axiosClient.get.mockResolvedValue({ data: { data: [] } })

      await client.autocompleteContacts({ query: 'jane' })

      expect(axiosClient.get).toHaveBeenCalledWith('https://ox.example.com/api/addressbooks', {
        params: {
          action: 'autocomplete',
          query: 'jane',
          columns: '1,500,555,556,557',
          email: true
        },
        signal: undefined
      })
    })

    it('maps column-array rows to contacts and prefers email1', async () => {
      const { client, axiosClient } = getClient()
      axiosClient.get.mockResolvedValue({
        data: {
          data: [
            [1, 'Jane Doe', 'jane@example.com', 'jane.work@example.com', null],
            [2, 'John Roe', null, 'john@example.com', null]
          ]
        }
      })

      const result = await client.autocompleteContacts({ query: 'j' })

      expect(result).toEqual([
        { id: '1', displayName: 'Jane Doe', email: 'jane@example.com' },
        { id: '2', displayName: 'John Roe', email: 'john@example.com' }
      ])
    })

    it('drops rows without any email address', async () => {
      const { client, axiosClient } = getClient()
      axiosClient.get.mockResolvedValue({
        data: {
          data: [
            [1, 'No Mail', null, null, null],
            [2, 'Has Mail', 'has@example.com', null, null]
          ]
        }
      })

      const result = await client.autocompleteContacts({ query: 'a' })

      expect(result).toEqual([{ id: '2', displayName: 'Has Mail', email: 'has@example.com' }])
    })
  })

  describe('sendMail', () => {
    it('throws when no api url is configured', async () => {
      const { client, axiosClient } = getClient('')
      await expect(
        client.sendMail({ to: { email: 'guest@example.com' }, subject: 's', htmlContent: '<p/>' })
      ).rejects.toThrow()
      expect(axiosClient.post).not.toHaveBeenCalled()
    })

    it('opens a composition space and sends the message', async () => {
      const { client, axiosClient } = getClient()
      axiosClient.post.mockResolvedValueOnce({ data: { data: { id: 'space-1' } } })
      axiosClient.post.mockResolvedValueOnce({ data: { success: true } })

      await client.sendMail({
        to: { name: 'Jane Doe', email: 'jane@example.com' },
        subject: '«Report.pdf» was shared with you',
        htmlContent: '<p>hello</p>'
      })

      // 1. open composition space
      expect(axiosClient.post).toHaveBeenNthCalledWith(
        1,
        'https://ox.example.com/api/mail/compose',
        [],
        { params: { type: 'new' }, signal: undefined }
      )

      // 2. send to the returned space id with a multipart JSON payload
      const [url, body] = axiosClient.post.mock.calls[1]
      expect(url).toBe('https://ox.example.com/api/mail/compose/space-1/send')
      expect(body).toBeInstanceOf(FormData)
      expect(JSON.parse((body as FormData).get('JSON') as string)).toEqual({
        to: [['Jane Doe', 'jane@example.com']],
        subject: '«Report.pdf» was shared with you',
        content: '<p>hello</p>',
        contentType: 'text/html'
      })
    })
  })
})
