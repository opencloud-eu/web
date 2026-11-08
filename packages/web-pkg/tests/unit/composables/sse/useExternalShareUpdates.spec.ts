import { flushPromises } from '@vue/test-utils'
import { MESSAGE_TYPE } from '@opencloud-eu/web-client/sse'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useExternalShareUpdates } from '../../../../src/composables/sse'

const SHARE_TOPICS = [
  MESSAGE_TYPE.SHARE_CREATED,
  MESSAGE_TYPE.SHARE_UPDATED,
  MESSAGE_TYPE.SHARE_REMOVED,
  MESSAGE_TYPE.LINK_CREATED,
  MESSAGE_TYPE.LINK_UPDATED,
  MESSAGE_TYPE.LINK_REMOVED
]

function setup({
  supportSSE = true,
  accessToken = 'token',
  publicLinkContextReady = false,
  itemIds = ['file-id', 'parent-id']
} = {}) {
  const listeners = new Map<string, (msg: MessageEvent) => void>()
  const sseAuthenticated = {
    addEventListener: vi.fn((topic: string, listener: (msg: MessageEvent) => void) => {
      listeners.set(topic, listener)
    }),
    removeEventListener: vi.fn((topic: string) => {
      listeners.delete(topic)
    })
  }
  const onExternalShareUpdate = vi.fn()
  const wrapper = getComposableWrapper(
    () => {
      useExternalShareUpdates({ itemIds, onExternalShareUpdate })
    },
    {
      provide: { $clientService: { initiatorId: 'own-tab', sseAuthenticated } },
      pluginOptions: {
        piniaOptions: {
          authState: { accessToken, publicLinkContextReady },
          capabilityState: { capabilities: { core: { 'support-sse': supportSSE } as any } }
        }
      }
    }
  )

  return {
    wrapper,
    sseAuthenticated,
    onExternalShareUpdate,
    emit(topic: string, data: unknown) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data)
      listeners.get(topic)?.({ data: payload } as MessageEvent)
    }
  }
}

describe('useExternalShareUpdates', () => {
  it('subscribes to the share and link topics and unsubscribes on unmount', () => {
    const s = setup()

    for (const topic of SHARE_TOPICS) {
      expect(s.sseAuthenticated.addEventListener).toHaveBeenCalledWith(topic, expect.any(Function))
    }

    s.wrapper.unmount()

    expect(s.sseAuthenticated.removeEventListener).toHaveBeenCalledTimes(SHARE_TOPICS.length)
  })

  it.each([
    ['SSE unsupported', { supportSSE: false }],
    ['no access token', { accessToken: '' }],
    ['public link context', { publicLinkContextReady: true }]
  ])('does not subscribe with %s', (_, options) => {
    const s = setup(options)

    expect(s.sseAuthenticated.addEventListener).not.toHaveBeenCalled()
  })

  it.each(['file-id', 'parent-id'])('reports a change of %s by another client', async (itemid) => {
    const s = setup()

    s.emit(MESSAGE_TYPE.LINK_UPDATED, { itemid, initiatorid: 'other-tab' })
    await flushPromises()

    expect(s.onExternalShareUpdate).toHaveBeenCalledTimes(1)
  })

  it('matches the server id of a space root with the space id', async () => {
    const s = setup({ itemIds: ['storage$space'] })

    s.emit(MESSAGE_TYPE.LINK_CREATED, { itemid: 'storage$space!space', initiatorid: 'other-tab' })
    s.emit(MESSAGE_TYPE.LINK_CREATED, { itemid: 'storage$space!file', initiatorid: 'other-tab' })
    await flushPromises()

    expect(s.onExternalShareUpdate).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['another item', { itemid: 'other-id', initiatorid: 'other-tab' }],
    ['this tab', { itemid: 'file-id', initiatorid: 'own-tab' }],
    ['no item id', { initiatorid: 'other-tab' }],
    ['malformed json', '{not json']
  ])('ignores %s', async (_, data) => {
    const s = setup()

    s.emit(MESSAGE_TYPE.SHARE_CREATED, data)
    await flushPromises()

    expect(s.onExternalShareUpdate).not.toHaveBeenCalled()
  })
})
