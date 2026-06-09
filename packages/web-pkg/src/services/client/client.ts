import { HttpClient } from '../../http'
import { graph, ocs, ox, webdav } from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import { OCS } from '@opencloud-eu/web-client/ocs'
import { OX } from '@opencloud-eu/web-client/ox'
import { AuthParameters } from './auth'
import axios from 'axios'
import { v4 as uuidV4 } from 'uuid'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { Language } from 'vue3-gettext'
import { FetchEventSourceInit } from '@microsoft/fetch-event-source'
import { sse } from '@opencloud-eu/web-client/sse'
import { AuthStore, CapabilityStore, ConfigStore } from '../../composables'
import { createVaultWebDav } from './vaultWebDav'

const createFetchOptions = (authParams: AuthParameters, language: string): FetchEventSourceInit => {
  return {
    headers: {
      Authorization: `Bearer ${authParams.accessToken}`,
      'Accept-Language': language,
      'X-Request-ID': uuidV4(),
      'X-Requested-With': 'XMLHttpRequest'
    }
  }
}

export interface ClientServiceOptions {
  configStore: ConfigStore
  language: Language
  authStore: AuthStore
  capabilityStore: CapabilityStore
}

export class ClientService {
  private configStore: ConfigStore
  private language: Language
  private authStore: AuthStore
  private capabilityStore: CapabilityStore

  private httpAuthenticatedClient: HttpClient
  private httpUnAuthenticatedClient: HttpClient

  private graphClient: Graph
  private ocsClient: OCS
  private oxClient: OX
  private webDavClient: WebDAV

  public initiatorId = uuidV4()

  private staticHeaders: Record<string, string> = {
    'Initiator-ID': this.initiatorId,
    'X-Requested-With': 'XMLHttpRequest'
  }

  constructor(options: ClientServiceOptions) {
    this.configStore = options.configStore
    this.language = options.language
    this.authStore = options.authStore
    this.capabilityStore = options.capabilityStore

    this.initGraphClient()
    this.initOcsClient()
    this.initOxClient()
    this.initWebDavClient()

    this.httpAuthenticatedClient = new HttpClient(
      { baseURL: this.configStore.serverUrl, headers: this.staticHeaders },
      (config) => {
        Object.assign(config.headers, this.getDynamicHeaders())
        return config
      }
    )
    this.httpUnAuthenticatedClient = new HttpClient(
      { baseURL: this.configStore.serverUrl, headers: this.staticHeaders },
      (config) => {
        Object.assign(config.headers, this.getDynamicHeaders({ useAuth: false }))
        return config
      }
    )
  }

  public get httpAuthenticated() {
    return this.httpAuthenticatedClient
  }

  public get httpUnAuthenticated() {
    return this.httpUnAuthenticatedClient
  }

  public get graphAuthenticated() {
    return this.graphClient
  }

  public get sseAuthenticated(): EventSource {
    return sse(
      this.configStore.serverUrl,
      createFetchOptions({ accessToken: this.authStore.accessToken }, this.currentLanguage)
    )
  }

  public get ocs() {
    return this.ocsClient
  }

  public get ox() {
    return this.oxClient
  }

  public get webdav() {
    return this.webDavClient
  }

  get currentLanguage() {
    return this.language.current
  }

  public getRequestHeaders = ({ useAuth = true }: { useAuth?: boolean } = {}) => {
    return {
      ...this.staticHeaders,
      ...this.getDynamicHeaders({ useAuth })
    }
  }

  private initGraphClient() {
    const axiosClient = axios.create({ headers: this.staticHeaders })
    axiosClient.interceptors.request.use((config) => {
      Object.assign(config.headers, this.getDynamicHeaders())
      return config
    })
    this.graphClient = graph(this.configStore.serverUrl, axiosClient)
  }

  private initOcsClient() {
    const axiosClient = axios.create({ headers: this.staticHeaders })
    axiosClient.interceptors.request.use((config) => {
      Object.assign(config.headers, this.getDynamicHeaders())
      return config
    })
    this.ocsClient = ocs(this.configStore.serverUrl, axiosClient)
  }

  private initOxClient() {
    const axiosClient = axios.create({ headers: this.staticHeaders })
    axiosClient.interceptors.request.use((config) => {
      Object.assign(config.headers, this.getDynamicHeaders())
      return config
    })
    this.oxClient = ox(axiosClient, () => this.capabilityStore.openXchangeApiUrl)
  }

  private initWebDavClient() {
    const client = webdav(this.configStore.serverUrl, () => {
      const headers = { ...this.staticHeaders, ...this.getDynamicHeaders() }

      if (this.authStore.publicLinkToken) {
        headers['public-token'] = this.authStore.publicLinkToken
      }

      if (this.authStore.publicLinkPassword) {
        headers['Authorization'] =
          'Basic ' +
          Buffer.from(['public', this.authStore.publicLinkPassword].join(':')).toString('base64')
      }

      return headers
    })
    // Wrap the raw client so folder-vault path/name translation happens
    // transparently for every caller (clear-text in, clear-text out). It's a
    // strict pass-through for any path that isn't inside a vault.
    this.webDavClient = createVaultWebDav(client)
  }

  /**
   * Dynamic headers that should be provided via callback or interceptor because they may
   * change during the lifetime of the application (e.g. token renewal).
   */
  private getDynamicHeaders({ useAuth = true }: { useAuth?: boolean } = {}): Record<
    string,
    string
  > {
    return {
      'Accept-Language': this.currentLanguage,
      'X-Request-ID': uuidV4(),
      ...(useAuth &&
        this.authStore.accessToken && { Authorization: 'Bearer ' + this.authStore.accessToken })
    }
  }
}
