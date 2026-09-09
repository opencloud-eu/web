import { HttpClient } from '../../../src/http'
import { ClientService, useAuthStore, useConfigStore } from '../../../src/'
import { Language } from 'vue3-gettext'
import { graph, ocs, ox, webdav } from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import { OCS } from '@opencloud-eu/web-client/ocs'
import { OX } from '@opencloud-eu/web-client/ox'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { sse } from '@opencloud-eu/web-client/sse'
import { createTestingPinia, writable } from '@opencloud-eu/web-test-helpers'
import axios, { InternalAxiosRequestConfig } from 'axios'
import { mock } from 'vitest-mock-extended'

const language = { current: 'en' }
const serverUrl = 'someUrl'

const getClientServiceMock = () => {
  const authStore = useAuthStore()
  const configStore = useConfigStore()
  writable(configStore).serverUrl = serverUrl

  return new ClientService({
    configStore,
    language: language as Language,
    authStore
  })
}
const v4uuid = '00000000-0000-0000-0000-000000000000'
vi.mock('@opencloud-eu/web-client/sse', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  sse: vi.fn()
}))
vi.mock('uuid', () => ({ v4: () => v4uuid }))
vi.mock('../../../src/http')
vi.mock('@opencloud-eu/web-client', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  graph: vi.fn(),
  ocs: vi.fn(),
  ox: vi.fn(),
  webdav: vi.fn()
}))

describe('ClientService', () => {
  beforeEach(() => {
    vi.mocked(HttpClient).mockClear()
    createTestingPinia({ initialState: { auth: { accessToken: 'token' } } })
  })
  describe('http authenticated', () => {
    it('initializes an http client', () => {
      const clientService = getClientServiceMock()
      expect(clientService.httpAuthenticated).toBeInstanceOf(HttpClient)
    })
    it('initializes the http client with baseURL and static headers', () => {
      const mocky = vi.mocked(HttpClient)
      getClientServiceMock()

      expect(mocky).toHaveBeenCalledWith(
        {
          baseURL: serverUrl,
          headers: { 'Initiator-ID': v4uuid, 'X-Requested-With': 'XMLHttpRequest' }
        },
        expect.anything()
      )
    })
  })
  describe('http unauthenticated', () => {
    it('initializes an http client', () => {
      const clientService = getClientServiceMock()
      expect(clientService.httpUnAuthenticated).toBeInstanceOf(HttpClient)
    })
    it('initializes the http client with baseURL and static headers', () => {
      const mocky = vi.mocked(HttpClient)
      getClientServiceMock()

      expect(mocky).toHaveBeenCalledWith(
        {
          baseURL: serverUrl,
          headers: { 'Initiator-ID': v4uuid, 'X-Requested-With': 'XMLHttpRequest' }
        },
        expect.anything()
      )
    })
  })
  describe('graph', () => {
    it('initializes an axios client with static headers', () => {
      const graphMock = mock<Graph>()
      const graphSpy = vi.mocked(graph).mockReturnValue(graphMock)
      const createSpy = vi.spyOn(axios, 'create')
      const clientService = getClientServiceMock()
      expect(createSpy).toHaveBeenCalledWith({
        headers: { 'Initiator-ID': v4uuid, 'X-Requested-With': 'XMLHttpRequest' }
      })
      expect(graphSpy).toHaveBeenCalledWith(serverUrl, expect.anything())
      expect(clientService.graphAuthenticated).toEqual(graphMock)
    })
  })
  describe('ocs', () => {
    it('initializes an axios client with static headers', () => {
      const ocsMock = mock<OCS>()
      const ocsSpy = vi.mocked(ocs).mockReturnValue(ocsMock)
      const createSpy = vi.spyOn(axios, 'create')
      const clientService = getClientServiceMock()
      expect(createSpy).toHaveBeenCalledWith({
        headers: { 'Initiator-ID': v4uuid, 'X-Requested-With': 'XMLHttpRequest' }
      })
      expect(ocsSpy).toHaveBeenCalledWith(serverUrl, expect.anything())
      expect(clientService.ocs).toEqual(ocsMock)
    })
  })
  describe('ox', () => {
    it('initializes an axios client with static headers and an api url resolver', () => {
      const oxMock = mock<OX>()
      const oxSpy = vi.mocked(ox).mockReturnValue(oxMock)
      const createSpy = vi.spyOn(axios, 'create')
      const clientService = getClientServiceMock()
      expect(createSpy).toHaveBeenCalledWith({
        headers: { 'Initiator-ID': v4uuid, 'X-Requested-With': 'XMLHttpRequest' }
      })
      expect(oxSpy).toHaveBeenCalledWith(expect.anything(), expect.any(Function))
      expect(clientService.ox).toEqual(oxMock)
    })
  })
  describe('webdav', () => {
    it('initializes a webdav client', () => {
      const webDavMock = mock<WebDAV>()
      const webDavSpy = vi.mocked(webdav).mockReturnValue(webDavMock)
      const clientService = getClientServiceMock()
      expect(webDavSpy).toHaveBeenCalledWith(serverUrl, expect.anything(), expect.anything())
      // the raw client is wrapped by the vault-aware decorator before it's
      // exposed, so it's no longer identical to the bare factory result
      expect(clientService.webdav).toBeDefined()
      expect(clientService.webdav.listFiles).toBeInstanceOf(Function)
    })
  })
  describe('sse', () => {
    it('authenticates with the access token', () => {
      const clientService = getClientServiceMock()
      void clientService.sseAuthenticated

      const options = vi.mocked(sse).mock.lastCall[1]
      expect(options.headers).toMatchObject({ Authorization: 'Bearer token' })
      expect(options.credentials).toBeUndefined()
    })
    it('authenticates a guest with the session cookie only', () => {
      const clientService = getClientServiceMock()
      const authStore = useAuthStore()
      authStore.accessToken = undefined
      authStore.guestContextReady = true
      void clientService.sseAuthenticated

      const options = vi.mocked(sse).mock.lastCall[1]
      expect(options.headers).not.toHaveProperty('Authorization')
      expect(options.credentials).toBe('include')
    })
  })
  describe('guest credentials', () => {
    it.each([true, false])(
      'sends credentials with authenticated http requests if guestContextReady=%s',
      (guestContextReady) => {
        getClientServiceMock()
        useAuthStore().guestContextReady = guestContextReady
        const interceptor = vi.mocked(HttpClient).mock.calls[0][1]

        const config = interceptor({ headers: {} } as InternalAxiosRequestConfig)

        expect((config as InternalAxiosRequestConfig).withCredentials).toBe(
          guestContextReady || undefined
        )
      }
    )
    it('never sends credentials with unauthenticated http requests', () => {
      getClientServiceMock()
      useAuthStore().guestContextReady = true
      const interceptor = vi.mocked(HttpClient).mock.calls[1][1]

      const config = interceptor({ headers: {} } as InternalAxiosRequestConfig)

      expect((config as InternalAxiosRequestConfig).withCredentials).toBeUndefined()
    })
    it.each([true, false])(
      'sends credentials with webdav requests if guestContextReady=%s',
      (guestContextReady) => {
        vi.mocked(webdav).mockReturnValue(mock<WebDAV>())
        getClientServiceMock()
        useAuthStore().guestContextReady = guestContextReady
        const withCredentials = vi.mocked(webdav).mock.lastCall[2]

        expect(withCredentials()).toBe(guestContextReady)
      }
    )
  })
})
