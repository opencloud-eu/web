import { SSEEventOptions } from './types'

export const onSSEBackchannelLogoutEvent = ({ router, authStore, sseData }: SSEEventOptions) => {
  if (!!authStore.sessionId && authStore.sessionId === sseData.sessionid) {
    return router.push({ name: 'logout' })
  }
}
