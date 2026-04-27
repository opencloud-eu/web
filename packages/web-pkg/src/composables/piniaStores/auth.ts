import { defineStore } from 'pinia'
import { ref } from 'vue'
import { PublicLinkType, urlJoin } from '@opencloud-eu/web-client'
import { HttpClient } from '../../http'
import { z } from 'zod'

const webFingerLinkSchema = z.object({
  rel: z.string(),
  href: z.string().optional()
})

export const webFingerResponseSchema = z.object({
  subject: z.string(),
  links: z.array(webFingerLinkSchema).optional(),
  properties: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional()
})

interface WebfingerDiscoveryData {
  authority: string
  client_id: string
  scope: string
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string>()
  const sessionId = ref<string>()
  const idpContextReady = ref(false)
  const userContextReady = ref(false)
  const publicLinkToken = ref<string>()
  const publicLinkPassword = ref<string>()
  const publicLinkType = ref<PublicLinkType>()
  const publicLinkContextReady = ref(false)
  const webfingerDiscoveryData = ref<WebfingerDiscoveryData>()

  const setAccessToken = (value: string) => {
    accessToken.value = value
  }
  const setSessionId = (value: string) => {
    sessionId.value = value
  }
  const setIdpContextReady = (value: boolean) => {
    idpContextReady.value = value
  }
  const setUserContextReady = (value: boolean) => {
    userContextReady.value = value
  }
  const setPublicLinkContext = (context: {
    publicLinkToken: string
    publicLinkPassword: string
    publicLinkType: PublicLinkType
    publicLinkContextReady: boolean
  }) => {
    publicLinkToken.value = context.publicLinkToken
    publicLinkPassword.value = context.publicLinkPassword
    publicLinkType.value = context.publicLinkType
    publicLinkContextReady.value = context.publicLinkContextReady
  }

  const clearUserContext = () => {
    setAccessToken(null)
    setSessionId(null)
    setIdpContextReady(null)
    setUserContextReady(null)
  }

  const clearPublicLinkContext = () => {
    setPublicLinkContext({
      publicLinkToken: null,
      publicLinkPassword: null,
      publicLinkType: null,
      publicLinkContextReady: false
    })
  }

  // gets the authority, client_id and scope for OIDC authentication via webfinger discovery
  const loadWebfingerDiscoveryData = async (serverUrl: string, client: HttpClient) => {
    const params = new URLSearchParams({
      resource: serverUrl,
      platform: 'web',
      rel: 'http://openid.net/specs/connect/1.0/issuer'
    })

    try {
      const response = await client.get(urlJoin(serverUrl, '.well-known/webfinger'), { params })

      const data = webFingerResponseSchema.parse(response.data)
      const { links, properties } = data
      const propKey = 'http://opencloud.eu/ns/oidc/'
      webfingerDiscoveryData.value = {
        authority: links[0].href,
        client_id: properties[`${propKey}client_id`] as string,
        scope: (properties[`${propKey}scopes`] as string[]).join(' ')
      }
    } catch (e) {
      throw new Error(`OIDC configuration could not be loaded via webfinger. ${e}`)
    }
  }

  return {
    accessToken,
    sessionId,
    idpContextReady,
    userContextReady,
    publicLinkToken,
    publicLinkPassword,
    publicLinkType,
    publicLinkContextReady,
    webfingerDiscoveryData,

    setAccessToken,
    setSessionId,
    setIdpContextReady,
    setUserContextReady,
    setPublicLinkContext,
    clearUserContext,
    clearPublicLinkContext,
    loadWebfingerDiscoveryData
  }
})

export type AuthStore = ReturnType<typeof useAuthStore>
