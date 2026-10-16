import { mockDeep } from 'vitest-mock-extended'
import { AuthStore, useRequest } from '../../../../src/composables'
import { ClientService } from '../../../../src/services'

describe('useRequest', () => {
  it.each([
    {
      name: 'a user',
      authState: { accessToken: 'token' },
      client: 'httpAuthenticated'
    },
    {
      name: 'a guest',
      authState: { guestContextReady: true },
      client: 'httpAuthenticated'
    },
    {
      name: 'a public link',
      authState: { accessToken: 'token', publicLinkContextReady: true },
      client: 'httpUnAuthenticated'
    },
    {
      name: 'an anonymous visitor',
      authState: {},
      client: 'httpUnAuthenticated'
    }
  ] as const)('uses the $client client for $name', async ({ authState, client }) => {
    const clientService = mockDeep<ClientService>()
    const authStore = mockDeep<AuthStore>({
      accessToken: undefined,
      guestContextReady: false,
      publicLinkContextReady: false,
      ...authState
    })

    const { makeRequest } = useRequest({ clientService, authStore })
    await makeRequest('POST', '/app/open')

    expect(clientService[client].request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', url: '/app/open' })
    )
  })
})
