import { SSEEventOptions } from './types'

export const onSSEBackchannelLogoutEvent = ({ router, authStore, sseData }: SSEEventOptions) => {
  if (sseData.sessionid) {
    if (authStore.sessionId === sseData.sessionid) {
      return router.push({ name: 'logout' })
    }

    return
  }

  // Log out all clients according to OIDC spec, when no session id is provided 
  return router.push({ name: 'logout' })
}
