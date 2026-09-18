import { defineStore } from 'pinia'
import { ref } from 'vue'
import { GraphSharePermission, PublicLinkType, urlJoin } from '@opencloud-eu/web-client'
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

export interface GuestSession {
  shareId: string
  shareName: string
  permissions: GraphSharePermission[]
  expiresAt: number
}

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
  const guestContextReady = ref(false)
  const guestShareId = ref<string>()
  const guestShareName = ref<string>()
  const guestPermissions = ref<GraphSharePermission[]>()
  const guestSessionExpiresAt = ref<number>()
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

  const setGuestContext = (session: GuestSession) => {
    guestShareId.value = session.shareId
    guestShareName.value = session.shareName
    guestPermissions.value = session.permissions
    guestSessionExpiresAt.value = session.expiresAt
    guestContextReady.value = true
  }

  // The share id is known before a session exists: a `token_expired` response to the initial
  // exchange carries it, and the renew endpoint plus the PIN form both need it.
  const setGuestShareId = (value: string) => {
    guestShareId.value = value
  }

  // Ends the session without forgetting which share it belonged to: the renew endpoint and the
  // PIN form both need the share id after the session died.
  const invalidateGuestSession = () => {
    guestContextReady.value = false
    guestSessionExpiresAt.value = null
  }

  const clearGuestContext = () => {
    guestContextReady.value = false
    guestShareId.value = null
    guestShareName.value = null
    guestPermissions.value = null
    guestSessionExpiresAt.value = null
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
    guestContextReady,
    guestShareId,
    guestShareName,
    guestPermissions,
    guestSessionExpiresAt,
    webfingerDiscoveryData,

    setAccessToken,
    setSessionId,
    setIdpContextReady,
    setUserContextReady,
    setPublicLinkContext,
    setGuestContext,
    setGuestShareId,
    invalidateGuestSession,
    clearGuestContext,
    clearUserContext,
    clearPublicLinkContext,
    loadWebfingerDiscoveryData
  }
})

export type AuthStore = ReturnType<typeof useAuthStore>
