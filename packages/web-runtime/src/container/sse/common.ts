import { SSEEventOptions } from './types'

export const onSSEBackchannelLogoutEvent = ({ router, sseData }: SSEEventOptions) => {
  if (sseData.sessionid) {
    return
  }

  // Logout all client when no session id is provided according to OIDC spec
  return router.push({ name: 'logout' })
}
