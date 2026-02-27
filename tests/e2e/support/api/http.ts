import { urlJoin } from '../utils/urlJoin'
import { APIResponse, request as apiRequest } from '@playwright/test'
import { User } from '../types'
import { config } from '../../config'
import { TokenEnvironmentFactory } from '../environment'

export const getAuthHeader = (user: User, isKeycloakRequest: boolean = false) => {
  const tokenEnvironment = TokenEnvironmentFactory(isKeycloakRequest ? 'keycloak' : null)
  const authHeader = {
    Authorization: 'Basic ' + Buffer.from(user.id + ':' + user.password).toString('base64')
  }

  if (!config.basicAuth) {
    authHeader.Authorization = 'Bearer ' + tokenEnvironment.getToken({ user }).accessToken
  }
  return authHeader
}

export const request = async ({
  method,
  path,
  body,
  user,
  header = {},
  isKeycloakRequest = false
}: {
  method: 'POST' | 'DELETE' | 'PUT' | 'GET' | 'MKCOL' | 'PROPFIND' | 'PATCH'
  path: string
  body?: Record<string, any> | string | null
  user?: User
  header?: object
  isKeycloakRequest?: boolean
}): Promise<APIResponse> => {
  const authHeader = getAuthHeader(user, isKeycloakRequest)
  const context = await apiRequest.newContext()

  const basicHeader = {
    'OCS-APIREQUEST': 'true',
    ...(user.username && authHeader),
    ...header
  }

  const baseUrl = isKeycloakRequest ? config.keycloakUrl : config.baseUrl

  return await context.fetch(urlJoin(baseUrl, path), {
    method,
    data: body,
    headers: basicHeader
  })
}

export const checkResponseStatus = (response: APIResponse, message = ''): void => {
  // response.status >= 200 && response.status < 300
  if (!response.ok()) {
    throw Error(`HTTP Request Failed: ${message}, Status: ${response.status()}`)
  }
}
