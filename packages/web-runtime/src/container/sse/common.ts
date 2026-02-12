import { SSEEventOptions } from './types'

export const onSSEBackchannelLogoutEvent = ({ router, authStore, sseData }: SSEEventOptions) => {
  if (sseData.sessionid) {
    if (authStore.sessionId === sseData.sessionid) {
      return router.push({ name: 'logout' })
    }

    return
  }

  // Log out all client when no session id is provided according to OIDC spec
  return router.push({ name: 'logout' })
}
