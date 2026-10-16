import { AuthStore } from '@opencloud-eu/web-pkg'
import {
  EventSchemaType,
  onSSEBackchannelLogoutEvent,
  SSEEventOptions
} from '../../../../src/container/sse'
import { mock } from 'vitest-mock-extended'
import { Router } from 'vue-router'

describe('onSSEBackchannelLogoutEvent', () => {
  it('logs out if the session id matches', () => {
    const options = getOptions('session-id', 'session-id')

    onSSEBackchannelLogoutEvent(options)

    expect(options.router.push).toHaveBeenCalledWith({ name: 'logout' })
  })

  it('does not log out if the session id differs', () => {
    const options = getOptions('session-id', 'other-session-id')

    onSSEBackchannelLogoutEvent(options)

    expect(options.router.push).not.toHaveBeenCalled()
  })

  it('does not log out without a session id', () => {
    const options = getOptions(undefined, undefined)

    onSSEBackchannelLogoutEvent(options)

    expect(options.router.push).not.toHaveBeenCalled()
  })
})

function getOptions(sessionId: string, sseSessionId: string) {
  return {
    router: mock<Router>(),
    authStore: { sessionId } as AuthStore,
    sseData: { sessionid: sseSessionId } as EventSchemaType
  } as unknown as SSEEventOptions
}
