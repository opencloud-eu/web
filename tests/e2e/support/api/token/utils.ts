import { TokenEnvironmentFactory } from '../../environment'
import { config } from '../../../config'
import { request, APIRequestContext } from '@playwright/test'
import { User } from '../../types'

const logonUrl = '/signin/v1/identifier/_/logon'
const redirectUrl = '/oidc-callback.html'
const tokenUrl = '/konnect/v1/token'

export const setAccessAndRefreshToken = async (user: User) => {
  const context = await request.newContext()
  const continueUrl = await getAuthorizedEndPoint(context, user)
  const code = await getCode(context, continueUrl)
  const tokenList = await getToken(context, code)

  const tokenEnvironment = TokenEnvironmentFactory()
  tokenEnvironment.setToken({
    user: { ...user },
    token: {
      userId: user.username,
      accessToken: tokenList.access_token,
      refreshToken: tokenList.refresh_token
    }
  })
}

const getAuthorizedEndPoint = async (context: APIRequestContext, user: User): Promise<string> => {
  const logonResponse = await context.post(config.baseUrl + logonUrl, {
    headers: {
      'Kopano-Konnect-XSRF': '1',
      Referer: config.baseUrl,
      'Content-Type': 'application/json'
    },
    data: {
      params: [user.username, user.password, '1'],
      hello: {
        scope: 'openid profile email',
        client_id: 'web',
        redirect_uri: config.baseUrl + redirectUrl,
        flow: 'oidc'
      }
    }
  })
  if (logonResponse.status() !== 200) {
    throw new Error(
      `Logon failed: Expected status code be 200 but received ${logonResponse.status()} Message: ${logonResponse.statusText()}`
    )
  }

  const data = (await logonResponse.json()) as { hello: { continue_uri: string } }
  return data.hello.continue_uri
}

const getCode = async (context: APIRequestContext, continueUrl: string): Promise<string> => {
  const params = new URLSearchParams({
    client_id: 'web',
    prompt: 'none',
    redirect_uri: config.baseUrl + redirectUrl,
    response_mode: 'query',
    response_type: 'code',
    scope: 'openid profile offline_access email'
  })
  const authorizeResponse = await context.get(continueUrl, {
    params: params,
    maxRedirects: 0
  })

  if (authorizeResponse.status() !== 302) {
    throw new Error(
      `Authorization failed: Expected status code be 302 but received ${authorizeResponse.status()} Message: ${authorizeResponse.statusText()}`
    )
  }

  const location = authorizeResponse.headers()['location'] || ''
  const code = new URLSearchParams(location.split('?')[1]).get('code')
  if (!code) throw new Error('Missing auth code')

  return code
}

interface Token {
  access_token: string
  refresh_token: string
}

const getToken = async (context: APIRequestContext, code: string): Promise<Token> => {
  const response = await context.post(config.baseUrl + tokenUrl, {
    form: {
      client_id: 'web',
      code: code,
      redirect_uri: config.baseUrl + redirectUrl,
      grant_type: 'authorization_code'
    }
  })
  if (response.status() !== 200) {
    throw new Error(
      `Request failed: Expected status code be 200 but received ${response.status()} Message: ${response.statusText()}`
    )
  }
  return (await response.json()) as Token
}
