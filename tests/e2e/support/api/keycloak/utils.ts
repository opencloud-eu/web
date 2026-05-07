import { APIResponse } from '@playwright/test'
import { request as httpRequest } from '../http'
import { User } from '../../types'
import { appConfig } from '../../../playwright.config'

export const realmBasePath = `admin/realms/${appConfig.keycloakRealm}`

export const request = async (args: {
  method: 'POST' | 'DELETE' | 'PUT' | 'GET' | 'MKCOL' | 'PROPFIND' | 'PATCH'
  path: string
  body?: Record<string, any> | string | null
  user?: User
  header?: object
}): Promise<APIResponse> => {
  return await httpRequest({ ...args, isKeycloakRequest: true })
}

export const getUserIdFromResponse = (response: APIResponse): string => {
  return response.headers()['location'].split('/').pop()
}

export const getKeycloakAdminUser = () => {
  return {
    id: appConfig.keycloakAdminUser,
    username: appConfig.keycloakAdminUser,
    displayName: appConfig.keycloakAdminUser,
    password: appConfig.keycloakAdminPassword,
    email: `${appConfig.keycloakAdminUser}@mail.test`
  }
}
