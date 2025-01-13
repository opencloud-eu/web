import { HttpClient } from '../../../src/http'
import { ClientService, useAuthStore, useConfigStore } from '../../../src/'
import { Language } from 'vue3-gettext'
import { graph, ocs, webdav } from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import { OCS } from '@opencloud-eu/web-client/ocs'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { createTestingPinia, writable } from '@opencloud-eu/web-test-helpers'
import axios from 'axios'
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
vi.mock('uuid', () => ({ v4: () => v4uuid }))
vi.mock('@opencloud-eu/web-client', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  graph: vi.fn(),
  ocs: vi.fn(),
  webdav: vi.fn()
}))

describe('ClientService', () => {
  beforeEach(() => {
    createTestingPinia({ initialState: { auth: { accessToken: 'token' } } })
  })
  describe('http authenticated', () => {
    it('initializes an http client', () => {
      const clientService = getClientServiceMock()
      expect(clientService.httpAuthenticated).toBeInstanceOf(HttpClient)
    })
    it('initializes the http client with baseURL and static headers', () => {
      vi.mock('../../../src/http')
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
      vi.mock('../../../src/http')
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
  describe('webdav', () => {
    it('initializes a webdav client', () => {
      const webDavMock = mock<WebDAV>()
      const webDavSpy = vi.mocked(webdav).mockReturnValue(webDavMock)
      const clientService = getClientServiceMock()
      expect(webDavSpy).toHaveBeenCalledWith(serverUrl, expect.anything())
      expect(clientService.webdav).toEqual(webDavMock)
    })
  })
})
