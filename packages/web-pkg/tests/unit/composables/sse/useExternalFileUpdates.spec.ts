import { nextTick, ref, unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { Resource } from '@opencloud-eu/web-client'
import { MESSAGE_TYPE } from '@opencloud-eu/web-client/sse'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useAuthStore } from '../../../../src/composables/piniaStores'
import { useExternalFileUpdates } from '../../../../src/composables/sse'

const FILE = {
  id: 'storage$space!file-1',
  fileId: 'storage$space!file-1',
  etag: 'etag-1'
} as Resource

function setup({
  supportSSE = true,
  accessToken = 'token',
  publicLinkContextReady = false,
  isActive = true,
  resource = FILE as Resource | undefined
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
  const clientService = { initiatorId: 'tab-own', sseAuthenticated }
  const resourceRef = ref(resource)
  const currentETag = ref('etag-1')
  const isActiveRef = ref(isActive)
  // Resolved by the test, so it can observe the queue while a handler runs.
  const handlerDone: Array<() => void> = []
  const onExternalEvent = vi.fn(() => new Promise<void>((resolve) => handlerDone.push(resolve)))
  const wrapper = getComposableWrapper(
    () => {
      useExternalFileUpdates({
        resource: resourceRef,
        currentETag,
        isActive: isActiveRef,
        onExternalEvent
      })
    },
    {
      provide: { $clientService: clientService },
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
    clientService,
    resourceRef,
    currentETag,
    isActiveRef,
    onExternalEvent,
    emit(topic: string, data: unknown) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data)
      listeners.get(topic)?.({ data: payload } as MessageEvent)
    },
    async finishHandler() {
      handlerDone.shift()?.()
      await flushPromises()
    }
  }
}

const event = (overrides: Record<string, unknown> = {}) => ({
  itemid: FILE.id,
  initiatorid: 'tab-other',
  etag: 'etag-2',
  ...overrides
})

describe('useExternalFileUpdates', () => {
  it('subscribes to both content topics and unsubscribes on unmount', () => {
    const s = setup()

    expect(s.sseAuthenticated.addEventListener).toHaveBeenCalledWith(
      MESSAGE_TYPE.POSTPROCESSING_FINISHED,
      expect.any(Function)
    )
    expect(s.sseAuthenticated.addEventListener).toHaveBeenCalledWith(
      MESSAGE_TYPE.FILE_TOUCHED,
      expect.any(Function)
    )

    s.wrapper.unmount()

    expect(s.sseAuthenticated.removeEventListener).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['SSE unsupported', { supportSSE: false }],
    ['no access token', { accessToken: '' }],
    ['public link context', { publicLinkContextReady: true }]
  ])('does not subscribe with %s', (_, options) => {
    const s = setup(options)

    expect(s.sseAuthenticated.addEventListener).not.toHaveBeenCalled()
  })

  it('hands a foreign write to the handler', async () => {
    const s = setup()

    s.emit(MESSAGE_TYPE.POSTPROCESSING_FINISHED, event())
    await flushPromises()

    expect(s.onExternalEvent).toHaveBeenCalledWith({ etag: 'etag-2' })
  })

  // `resetSSE` on logout nulls the singleton, and the getter would build a
  // fresh, tokenless stream if unsubscribing went through it.
  it('unsubscribes from the stream it subscribed to, not a fresh one', async () => {
    const s = setup()
    const fresh = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
    s.clientService.sseAuthenticated = fresh as any

    useAuthStore().accessToken = null
    await nextTick()

    expect(s.sseAuthenticated.removeEventListener).toHaveBeenCalledTimes(2)
    expect(fresh.removeEventListener).not.toHaveBeenCalled()
    expect(fresh.addEventListener).not.toHaveBeenCalled()
  })

  it.each([
    ['another file', event({ itemid: 'storage$space!file-9' })],
    ['our own write', event({ initiatorid: 'tab-own' })],
    ['the etag we already have', event({ etag: 'etag-1' })],
    ['no etag', event({ etag: undefined })],
    ['malformed json', '{not json']
  ])('ignores %s', async (_, data) => {
    const s = setup()

    s.emit(MESSAGE_TYPE.FILE_TOUCHED, data)
    await flushPromises()

    expect(s.onExternalEvent).not.toHaveBeenCalled()
  })

  it('matches a share recipient by the composite file id', async () => {
    const s = setup({
      resource: { id: 'share-id', fileId: FILE.id, etag: 'etag-1' } as Resource
    })

    s.emit(MESSAGE_TYPE.POSTPROCESSING_FINISHED, event())
    await flushPromises()

    expect(s.onExternalEvent).toHaveBeenCalledTimes(1)
  })

  // Dropping it would lose the update: nothing else notices a write that
  // lands during a load, a save or a reconnect.
  it('keeps the latest event while inactive and runs it once active', async () => {
    const s = setup({ isActive: false })

    s.emit(MESSAGE_TYPE.POSTPROCESSING_FINISHED, event({ etag: 'etag-2' }))
    s.emit(MESSAGE_TYPE.POSTPROCESSING_FINISHED, event({ etag: 'etag-3' }))
    await flushPromises()
    expect(s.onExternalEvent).not.toHaveBeenCalled()

    s.isActiveRef.value = true
    await nextTick()
    await flushPromises()

    expect(s.onExternalEvent).toHaveBeenCalledTimes(1)
    expect(s.onExternalEvent).toHaveBeenCalledWith({ etag: 'etag-3' })
  })

  it('runs one handler at a time and coalesces events that arrive meanwhile', async () => {
    const s = setup()

    s.emit(MESSAGE_TYPE.POSTPROCESSING_FINISHED, event({ etag: 'etag-2' }))
    await flushPromises()
    s.emit(MESSAGE_TYPE.POSTPROCESSING_FINISHED, event({ etag: 'etag-3' }))
    s.emit(MESSAGE_TYPE.POSTPROCESSING_FINISHED, event({ etag: 'etag-4' }))
    await flushPromises()
    expect(s.onExternalEvent).toHaveBeenCalledTimes(1)

    await s.finishHandler()

    expect(s.onExternalEvent).toHaveBeenCalledTimes(2)
    expect(s.onExternalEvent).toHaveBeenLastCalledWith({ etag: 'etag-4' })
  })

  it('drops a waiting event when the resource changes', async () => {
    const s = setup({ isActive: false })

    s.emit(MESSAGE_TYPE.POSTPROCESSING_FINISHED, event())
    s.resourceRef.value = { ...unref(s.resourceRef), id: 'other', fileId: 'other' } as Resource
    await nextTick()
    s.isActiveRef.value = true
    await nextTick()
    await flushPromises()

    expect(s.onExternalEvent).not.toHaveBeenCalled()
  })

  it('keeps going after a handler failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const s = setup()
    s.onExternalEvent.mockRejectedValueOnce(new Error('boom'))

    s.emit(MESSAGE_TYPE.POSTPROCESSING_FINISHED, event({ etag: 'etag-2' }))
    await flushPromises()
    s.emit(MESSAGE_TYPE.POSTPROCESSING_FINISHED, event({ etag: 'etag-3' }))
    await flushPromises()

    expect(s.onExternalEvent).toHaveBeenCalledTimes(2)
    expect(console.error).toHaveBeenCalled()
  })
})
