import { ref } from 'vue'
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
  itemIds = ref(['file-id', 'parent-id'])
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
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

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

  it.each(['file-id', 'parent-id'])('reports a change of %s by another client', (itemid) => {
    const s = setup()

    s.emit(MESSAGE_TYPE.LINK_UPDATED, { itemid, initiatorid: 'other-tab' })
    vi.runAllTimers()

    expect(s.onExternalShareUpdate).toHaveBeenCalledTimes(1)
  })

  it('matches the server id of a space root with the space id', () => {
    const s = setup({ itemIds: ref(['storage$space']) })

    s.emit(MESSAGE_TYPE.LINK_CREATED, { itemid: 'storage$space!space', initiatorid: 'other-tab' })
    vi.runAllTimers()
    s.emit(MESSAGE_TYPE.LINK_CREATED, { itemid: 'storage$space!file', initiatorid: 'other-tab' })
    vi.runAllTimers()

    expect(s.onExternalShareUpdate).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['another item', { itemid: 'other-id', initiatorid: 'other-tab' }],
    ['this tab', { itemid: 'file-id', initiatorid: 'own-tab' }],
    ['no item id', { initiatorid: 'other-tab' }],
    ['malformed json', '{not json']
  ])('ignores %s', (_, data) => {
    const s = setup()

    s.emit(MESSAGE_TYPE.SHARE_CREATED, data)
    vi.runAllTimers()

    expect(s.onExternalShareUpdate).not.toHaveBeenCalled()
  })

  it('reports a burst of changes once after the last one', () => {
    const s = setup()

    s.emit(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
    vi.advanceTimersByTime(200)
    s.emit(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
    s.emit(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
    vi.advanceTimersByTime(200)
    s.emit(MESSAGE_TYPE.LINK_CREATED, { itemid: 'parent-id', initiatorid: 'other-tab' })
    vi.advanceTimersByTime(299)

    expect(s.onExternalShareUpdate).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)

    expect(s.onExternalShareUpdate).toHaveBeenCalledTimes(1)
  })

  it('reports changes that are further apart one by one', () => {
    const s = setup()

    s.emit(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
    vi.advanceTimersByTime(300)
    s.emit(MESSAGE_TYPE.SHARE_REMOVED, { itemid: 'file-id', initiatorid: 'other-tab' })
    vi.advanceTimersByTime(300)

    expect(s.onExternalShareUpdate).toHaveBeenCalledTimes(2)
  })

  it('does not extend a pending report with a change of another item', () => {
    const s = setup()

    s.emit(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
    vi.advanceTimersByTime(200)
    s.emit(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'other-id', initiatorid: 'other-tab' })
    vi.advanceTimersByTime(100)

    expect(s.onExternalShareUpdate).toHaveBeenCalledTimes(1)
  })

  it('drops a pending report on unmount', () => {
    const s = setup()

    s.emit(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
    s.wrapper.unmount()
    vi.runAllTimers()

    expect(s.onExternalShareUpdate).not.toHaveBeenCalled()
  })

  it('drops a pending report once the changed item is no longer shown', () => {
    const itemIds = ref(['file-id', 'parent-id'])
    const s = setup({ itemIds })

    s.emit(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
    itemIds.value = ['other-id', 'parent-id']
    vi.runAllTimers()

    expect(s.onExternalShareUpdate).not.toHaveBeenCalled()
  })

  it('keeps a pending report when more items get shown', () => {
    const itemIds = ref(['file-id'])
    const s = setup({ itemIds })

    s.emit(MESSAGE_TYPE.SHARE_CREATED, { itemid: 'file-id', initiatorid: 'other-tab' })
    itemIds.value = ['file-id', 'parent-id']
    vi.runAllTimers()

    expect(s.onExternalShareUpdate).toHaveBeenCalledTimes(1)
  })
})
