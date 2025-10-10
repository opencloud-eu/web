import { TokenEnvironmentFactory } from '../../environment'
import { config } from '../../../config'
import { User } from '../../types'
import { request, APIRequestContext } from '@playwright/test'
import { getKeycloakAdminUser } from './utils'

interface openCloudTokenForKeycloak {
  access_token: string
  refresh_token: string
}

const authorizationEndpoint = config.keycloakUrl + '/realms/openCloud/protocol/openid-connect/auth'
const tokenEndpoint = config.keycloakUrl + '/realms/openCloud/protocol/openid-connect/token'
const redirectUrl = config.baseUrl + '/oidc-callback.html'
const tokenMasterEndpoint = config.keycloakUrl + '/realms/master/protocol/openid-connect/token'

async function getAuthorizationEndPoint(context: APIRequestContext): Promise<string> {
  const loginParams = {
    client_id: 'web',
    redirect_uri: redirectUrl,
    response_mode: 'query',
    response_type: 'code',
    scope: 'openid profile email'
  }
  const queryString = new URLSearchParams(loginParams).toString()
  const authorizationUrl = `${authorizationEndpoint}?${queryString}`

  const authorizationResponse = await context.get(authorizationUrl, {
    maxRedirects: 0
  })

  if (authorizationResponse.status() === 302) {
    const locationHeader = authorizationResponse.headers()['location']
    const urlParams = new URLSearchParams(new URL(locationHeader).search)
    const errorDescription = urlParams.get('error_description')
    throw new Error(`Unexpected redirection. ${errorDescription}`)
  } else if (authorizationResponse.status() !== 200) {
    throw new Error(
      `Authorization failed: Expected status code to be 200 but received ${authorizationResponse.status()}. \nMessage: ${authorizationResponse.statusText()}`
    )
  }

  const htmlData = await authorizationResponse.text()

  // authorization url for login is send back from server in the HTML body.
  const match = htmlData.match(/action="([^"]+)"/)
  if (!match) {
    throw new Error('No authorization url found in the HTML response body.')
  }
  const auhorizationUrl = match[1]
  return auhorizationUrl
}

const getCode = async (
  context: APIRequestContext,
  user: User,
  auhorizationUrl: string
): Promise<string> => {
  const authCodeResponse = await context.post(auhorizationUrl, {
    form: {
      username: user.username,
      password: user.password
    },
    maxRedirects: 0
  })

  if (authCodeResponse.status() !== 302) {
    throw new Error(
      `Login failed: Expected status code to be 302 but received ${authCodeResponse.status()}. \nMessage: ${authCodeResponse.statusText()}`
    )
  }

  const locationHeader = authCodeResponse.headers()['location'] || ''
  const urlParams = new URLSearchParams(new URL(locationHeader).search)
  return urlParams.get('code')
}

const getToken = async (context: APIRequestContext, authorizationCode: string) => {
  const tokenResponse = await context.post(tokenEndpoint, {
    form: {
      client_id: 'web',
      code: authorizationCode,
      redirect_uri: redirectUrl,
      grant_type: 'authorization_code'
    }
  })

  if (tokenResponse.status() !== 200) {
    throw new Error(
      `Failed to retrieve token: Expected status code to be 200 but received ${tokenResponse.status}. \nMessage: ${tokenResponse.statusText}`
    )
  }

  return tokenResponse
}

export const setAccessTokenForKeycloakOpenCloudUser = async (user: User) => {
  const context = await request.newContext()
  const auhorizationUrl = await getAuthorizationEndPoint(context)
  const authorizationCode = await getCode(context, user, auhorizationUrl)
  const tokenResponse = await getToken(context, authorizationCode)
  const token = (await tokenResponse.json()) as openCloudTokenForKeycloak

  const tokenEnvironment = TokenEnvironmentFactory()
  tokenEnvironment.setToken({
    user: { ...user },
    token: {
      userId: user.username,
      accessToken: token.access_token,
      refreshToken: token.refresh_token
    }
  })
}

export const refreshAccessTokenForKeycloakOpenCloudUser = async (user: User) => {
  const context = await request.newContext()
  const tokenEnvironment = TokenEnvironmentFactory()
  const refreshToken = tokenEnvironment.getToken({ user }).refreshToken
  const tokenResponse = await context.post(tokenEndpoint, {
    form: {
      client_id: 'web',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }
  })
  if (tokenResponse.status() !== 200) {
    throw new Error(
      `Failed to retrieve token: Expected status code to be 200 but received ${tokenResponse.status}. \nMessage: ${tokenResponse.statusText}`
    )
  }

  const token = (await tokenResponse.json()) as openCloudTokenForKeycloak
  tokenEnvironment.setToken({
    user: { ...user },
    token: {
      userId: user.username,
      accessToken: token.access_token,
      refreshToken: token.refresh_token
    }
  })
}

interface KeycloakToken {
  access_token: string
  refresh_token: string
}

export const refreshKeycloakAdminAccessToken = async (): Promise<void> => {
  const adminUser = getKeycloakAdminUser()
  const tokenEnvironment = TokenEnvironmentFactory('keycloak')
  const refreshToken = tokenEnvironment.getToken({ user: adminUser }).refreshToken
  const context = await request.newContext()

  const refreshResponse = await context.post(tokenMasterEndpoint, {
    form: {
      client_id: 'admin-cli',
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }
  })
  if (refreshResponse.status() !== 200) {
    throw new Error(
      `Failed to retrieve token: Expected status code to be 200 but received ${refreshResponse.status()}. \nMessage: ${refreshResponse.statusText()}`
    )
  }

  const resBody = (await refreshResponse.json()) as KeycloakToken

  // update tokens
  tokenEnvironment.setToken({
    user: { ...adminUser },
    token: {
      userId: adminUser.username,
      accessToken: resBody.access_token,
      refreshToken: resBody.refresh_token
    }
  })
}

export const setKeycloakAdminAccessToken = async (): Promise<void> => {
  const adminUser = getKeycloakAdminUser()
  const context = await request.newContext()
  const response = await context.post(tokenMasterEndpoint, {
    // password grant type is used to get keycloak token.
    // This approach is not recommended and used only for the test
    form: {
      client_id: 'admin-cli',
      username: adminUser.username,
      password: adminUser.password,
      grant_type: 'password'
    }
  })

  const resBody = (await response.json()) as KeycloakToken
  const tokenEnvironment = TokenEnvironmentFactory('keycloak')

  tokenEnvironment.setToken({
    user: { ...adminUser },
    token: {
      userId: adminUser.username,
      accessToken: resBody.access_token,
      refreshToken: resBody.refresh_token
    }
  })
}
