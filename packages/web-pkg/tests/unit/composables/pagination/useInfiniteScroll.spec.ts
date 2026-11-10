import { nextTick, ref, Ref, unref } from 'vue'
import { InfiniteScrollResult, useInfiniteScroll } from '../../../../src/composables'
import { eventBus } from '../../../../src/services'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { flushPromises, VueWrapper } from '@vue/test-utils'

const getItems = (amount: number) => Array.from({ length: amount }, (_, i) => ({ id: `${i + 1}` }))

const mountedWrappers: Array<VueWrapper> = []
const cleanupTracker = new WeakSet<VueWrapper>()

afterEach(() => {
  while (mountedWrappers.length) {
    const wrapper = mountedWrappers.pop()
    if (!cleanupTracker.has(wrapper)) {
      wrapper.unmount()
    }
  }
})

describe('useInfiniteScroll', () => {
  describe('rendered items', () => {
    it('renders a single chunk initially', () => {
      const items = ref(getItems(250))
      const { result } = getWrapper(items)

      expect(unref(result.items)).toEqual(items.value.slice(0, 100))
      expect(unref(result.renderedCount)).toBe(100)
      expect(unref(result.total)).toBe(250)
      expect(unref(result.allLoaded)).toBe(false)
    })
    it('renders all items at once when they fit into one chunk', () => {
      const items = ref(getItems(6))
      const { result } = getWrapper(items)

      expect(unref(result.items)).toEqual(items.value)
      expect(unref(result.allLoaded)).toBe(true)
    })
    it('appends the next chunk on loadMore', () => {
      const items = ref(getItems(250))
      const { result } = getWrapper(items)

      result.loadMore()

      expect(unref(result.renderedCount)).toBe(200)
      expect(unref(result.items)).toEqual(items.value.slice(0, 200))
      expect(unref(result.allLoaded)).toBe(false)
    })
    it('caps the rendered items at the total amount', () => {
      const items = ref(getItems(250))
      const { result } = getWrapper(items)

      result.loadMore()
      result.loadMore()

      expect(unref(result.renderedCount)).toBe(250)
      expect(unref(result.items)).toEqual(items.value)
      expect(unref(result.allLoaded)).toBe(true)
    })
    it('ignores loadMore once everything is rendered', () => {
      const items = ref(getItems(6))
      const { result } = getWrapper(items)

      result.loadMore()

      expect(unref(result.items)).toEqual(items.value)
      expect(unref(result.allLoaded)).toBe(true)
      expect(unref(result.renderedCount)).toBe(100)
    })
    it('keeps the rendered items valid when the given items shrink (e.g. after deletion)', async () => {
      const items = ref(getItems(250))
      const { result } = getWrapper(items)

      result.loadMore()
      items.value = items.value.slice(0, 50)
      await nextTick()

      expect(unref(result.items)).toEqual(items.value)
      expect(unref(result.allLoaded)).toBe(true)
    })
  })
  describe('expandTo', () => {
    it('renders the chunk of the given resource', () => {
      const items = ref(getItems(250))
      const { result } = getWrapper(items)

      result.expandTo('134')

      expect(unref(result.renderedCount)).toBe(200)
      expect(unref(result.items)).toEqual(items.value.slice(0, 200))
      expect(unref(result.allLoaded)).toBe(false)
    })
    it('respects the amount that is already rendered', () => {
      const items = ref(getItems(250))
      const { result } = getWrapper(items)

      result.loadMore()
      result.expandTo('10')

      expect(unref(result.renderedCount)).toBe(200)
    })
    it('ignores unknown resources', () => {
      const items = ref(getItems(250))
      const { result } = getWrapper(items)

      result.expandTo('9999')

      expect(unref(result.renderedCount)).toBe(100)
    })
  })
  describe('event bus subscription', () => {
    it('expands to the chunk of a not yet rendered resource and publishes the scrollTo event', async () => {
      const items = ref(getItems(250))
      const publishSpy = vi.spyOn(eventBus, 'publish')
      const { result } = getWrapper(items)
      const payload = { resourceId: '134', forceScroll: true, topbarElement: 'files-app-bar' }

      eventBus.publish('app.files.navigate.page', payload)
      /**
       * The scrollTo event is published only after the DOM has been patched, so it
       * must not be published synchronously.
       */
      expect(publishSpy).not.toHaveBeenCalledWith('app.files.navigate.scrollTo', expect.anything())
      await flushPromises()

      expect(publishSpy).toHaveBeenCalledWith('app.files.navigate.scrollTo', payload)
      expect(unref(result.renderedCount)).toBe(200)
    })
    it('does not react while disabled', async () => {
      const items = ref(getItems(250))
      const enabled = ref(false)
      const publishSpy = vi.spyOn(eventBus, 'publish')
      const { result } = getWrapper(items, { enabled })

      eventBus.publish('app.files.navigate.page', {
        resourceId: '134',
        forceScroll: true,
        topbarElement: 'files-app-bar'
      })
      await flushPromises()

      expect(publishSpy).not.toHaveBeenCalledWith('app.files.navigate.scrollTo', expect.anything())
      expect(unref(result.renderedCount)).toBe(100)
    })
    it('subscribes and unsubscribes along with the enabled option', async () => {
      const subscribeSpy = vi.spyOn(eventBus, 'subscribe')
      const unsubscribeSpy = vi.spyOn(eventBus, 'unsubscribe')
      const items = ref(getItems(250))
      const enabled = ref(false)
      getWrapper(items, { enabled })

      expect(subscribeSpy).not.toHaveBeenCalledWith('app.files.navigate.page', expect.anything())

      enabled.value = true
      await nextTick()

      expect(subscribeSpy).toHaveBeenCalledWith('app.files.navigate.page', expect.anything())
      const token = subscribeSpy.mock.results[subscribeSpy.mock.results.length - 1].value
      expect(unsubscribeSpy).not.toHaveBeenCalledWith('app.files.navigate.page', token)
    })
    it('unsubscribes on unmount', () => {
      const items = ref(getItems(250))
      const subscribeSpy = vi.spyOn(eventBus, 'subscribe')
      const unsubscribeSpy = vi.spyOn(eventBus, 'unsubscribe')
      const { wrapper } = getWrapper(items)

      expect(subscribeSpy).toHaveBeenCalledWith('app.files.navigate.page', expect.anything())
      const token = subscribeSpy.mock.results[subscribeSpy.mock.results.length - 1].value
      expect(unsubscribeSpy).not.toHaveBeenCalledWith('app.files.navigate.page', token)
      wrapper.unmount()
      cleanupTracker.add(wrapper)
      expect(unsubscribeSpy).toHaveBeenCalledWith('app.files.navigate.page', token)
    })
  })
  describe('resets', () => {
    it('resets to a single chunk when the reset key changes', async () => {
      const items = ref(getItems(250))
      const resetKey = ref('folder-1')
      const { result } = getWrapper(items, { resetKey })

      result.loadMore()
      resetKey.value = 'folder-2'
      await nextTick()

      expect(unref(result.renderedCount)).toBe(100)
    })
    it('does not reset on an identical reset key', async () => {
      const items = ref(getItems(250))
      const resetKey = ref('folder-1')
      const { result } = getWrapper(items, { resetKey })

      result.loadMore()
      resetKey.value = 'folder-1'
      await nextTick()

      expect(unref(result.renderedCount)).toBe(200)
    })
    it('resets to a single chunk when a resetOn value changes', async () => {
      const items = ref(getItems(250))
      const filterTerm = ref('')
      const { result } = getWrapper(items, { resetOn: [filterTerm] })

      result.loadMore()
      filterTerm.value = 'test'
      await nextTick()

      expect(unref(result.renderedCount)).toBe(100)
    })
  })
})

type Item = { id: string }

function getWrapper(
  items: Ref<Array<Item>>,
  {
    enabled = undefined,
    resetKey = undefined,
    resetOn = undefined
  }: {
    enabled?: Ref<boolean>
    resetKey?: Ref<string>
    resetOn?: Array<Ref<unknown>>
  } = {}
): { wrapper: VueWrapper; result: InfiniteScrollResult<Item> } {
  let result!: InfiniteScrollResult<Item>
  const wrapper = getComposableWrapper(() => {
    result = useInfiniteScroll({ items, enabled, resetKey, resetOn })
  })
  mountedWrappers.push(wrapper)

  return { wrapper, result }
}
