import { SSEEventOptions } from './types'

export const onSSEBackchannelLogoutEvent = ({ router, authStore, sseData }: SSEEventOptions) => {
  if (!sseData.sessionid) {
    // Log out all clients when no session id is provided according to OIDC spec
    return router.push({ name: 'logout' })
  }

  if (authStore.sessionId === sseData.sessionid) {
    return router.push({ name: 'logout' })
  }
}
