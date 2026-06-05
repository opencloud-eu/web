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
})
