import { mockDeep } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  getComposableWrapper,
  mockAxiosResolve
} from '@opencloud-eu/web-test-helpers'
import { ClientService, useMessages } from '@opencloud-eu/web-pkg'
import { useWayf } from '../../../src/composables/useWayf'
import { WayfProvider } from '../../../src/types/wayf'

const token = 'invite-token'
const providerDomain = 'cloud.example.org'
const maliciousUrls = [
  'javascript:alert(document.domain)//https://evil.example.com',
  'JavaScript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)'
]

describe('useWayf', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'own.example.org', href: 'https://own.example.org/wayf' }
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  describe('buildProviderUrl', () => {
    it('adds token and providerDomain to an https url', () => {
      getWrapper({
        setup: ({ buildProviderUrl }) => {
          expect(buildProviderUrl('https://remote.example.com/accept', token, providerDomain)).toBe(
            `https://remote.example.com/accept?providerDomain=${providerDomain}&token=${token}`
          )
        }
      })
    })
    it.each(maliciousUrls)('throws for the non-http url "%s"', (url) => {
      getWrapper({
        setup: ({ buildProviderUrl }) => {
          expect(() => buildProviderUrl(url, token, providerDomain)).toThrow()
        }
      })
    })
  })

  describe('navigateToProvider', () => {
    it('redirects to the invite accept dialog of the provider', () => {
      return getWrapper({
        setup: async ({ navigateToProvider }) => {
          await navigateToProvider(getProvider('/accept'), token, providerDomain)
          expect(window.location.href).toBe(
            `https://remote.example.com/accept?providerDomain=${providerDomain}&token=${token}`
          )
        }
      })
    })
    it.each(maliciousUrls)('does not redirect to the non-http url "%s"', (url) => {
      return getWrapper({
        setup: async ({ navigateToProvider }) => {
          await navigateToProvider(getProvider(url), token, providerDomain)
          expect(window.location.href).toBe('https://own.example.org/wayf')
          expect(useMessages().showErrorMessage).toHaveBeenCalled()
        }
      })
    })
  })

  describe('navigateToManualProvider', () => {
    it('redirects to the discovered invite accept dialog', () => {
      return getWrapper({
        discoveredUrl: 'https://remote.example.com/accept',
        setup: async ({ navigateToManualProvider }) => {
          await navigateToManualProvider('remote.example.com', token, providerDomain)
          expect(window.location.href).toBe(
            `https://remote.example.com/accept?providerDomain=${providerDomain}&token=${token}`
          )
        }
      })
    })
    it.each(maliciousUrls)('does not redirect to the discovered non-http url "%s"', (url) => {
      return getWrapper({
        discoveredUrl: url,
        setup: async ({ navigateToManualProvider }) => {
          await navigateToManualProvider('remote.example.com', token, providerDomain)
          expect(window.location.href).toBe('https://own.example.org/wayf')
          expect(useMessages().showErrorMessage).toHaveBeenCalled()
        }
      })
    })
  })
})

function getProvider(inviteAcceptDialog: string): WayfProvider {
  return { name: 'Remote', fqdn: 'remote.example.com', inviteAcceptDialog }
}

function getWrapper({
  setup,
  discoveredUrl = ''
}: {
  setup: (instance: ReturnType<typeof useWayf>) => void | Promise<void>
  discoveredUrl?: string
}) {
  const clientService = mockDeep<ClientService>()
  clientService.httpUnAuthenticated.post.mockResolvedValue(
    mockAxiosResolve({ inviteAcceptDialog: discoveredUrl })
  )
  const mocks = { ...defaultComponentMocks(), $clientService: clientService }

  let done: void | Promise<void>
  getComposableWrapper(
    () => {
      done = setup(useWayf())
    },
    { mocks, provide: mocks }
  )
  return done
}
