import { useClientService } from '../clientService'
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router'
import type { Method, AxiosRequestConfig, AxiosResponse } from 'axios'
import { Auth, ClientService } from '../../services'
import { AuthStore, useAuthStore } from '../piniaStores'

interface RequestOptions {
  router?: Router
  authStore?: AuthStore
  clientService?: ClientService
  currentRoute?: RouteLocationNormalizedLoaded
}

export interface RequestResult {
  makeRequest(method: Method, url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>
}

export function useRequest(options: RequestOptions = {}): RequestResult {
  const clientService = options.clientService ?? useClientService()
  const authStore = options.authStore ?? useAuthStore()

  const makeRequest = (
    method: Method,
    url: string,
    config: AxiosRequestConfig = {}
  ): Promise<AxiosResponse> => {
    const httpClient =
      !authStore.accessToken || authStore.publicLinkContextReady
        ? clientService.httpUnAuthenticated
        : clientService.httpAuthenticated

    const auth = new Auth({
      accessToken: authStore.accessToken,
      publicLinkToken: authStore.publicLinkToken,
      publicLinkPassword: authStore.publicLinkPassword
    })

    config.method = method
    config.url = url
    config.headers = { ...auth.getHeaders(), ...(config?.headers || {}) }

    return httpClient.request(config)
  }

  return {
    makeRequest
  }
}
