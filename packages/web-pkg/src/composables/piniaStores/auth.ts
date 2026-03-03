import { defineStore } from 'pinia'
import { ref } from 'vue'
import { PublicLinkType } from '@opencloud-eu/web-client'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string>()
  const sessionId = ref<string>()
  const idpContextReady = ref(false)
  const userContextReady = ref(false)
  const publicLinkToken = ref<string>()
  const publicLinkPassword = ref<string>()
  const publicLinkType = ref<PublicLinkType>()
  const publicLinkContextReady = ref(false)

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

  return {
    accessToken,
    sessionId,
    idpContextReady,
    userContextReady,
    publicLinkToken,
    publicLinkPassword,
    publicLinkType,
    publicLinkContextReady,

    setAccessToken,
    setSessionId,
    setIdpContextReady,
    setUserContextReady,
    setPublicLinkContext,
    clearUserContext,
    clearPublicLinkContext
  }
})

export type AuthStore = ReturnType<typeof useAuthStore>
