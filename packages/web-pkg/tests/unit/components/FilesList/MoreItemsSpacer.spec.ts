import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { enableAutoUnmount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MoreItemsSpacer from '../../../../src/components/FilesList/MoreItemsSpacer.vue'

enableAutoUnmount(afterEach)

const selectors = {
  sentinel: '[data-testid="files-infinite-scroll-sentinel"]',
  showMore: '[data-testid="files-show-more"]'
}

const emittedLoadMore = (wrapper: ReturnType<typeof mount>): number => {
  // depending on the emit declaration the event is recorded camelOr kebab-cased
  const events = wrapper.emitted('loadMore') || wrapper.emitted('load-more')
  return events ? events.length : 0
}

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  private callback: (entries: Array<IntersectionObserverEntry>) => void
  private targets: Array<Element> = []

  constructor(callback: (entries: Array<IntersectionObserverEntry>) => void) {
    this.callback = callback
    FakeIntersectionObserver.instances.push(this)
  }
  observe(target: Element) {
    this.targets.push(target)
  }
  unobserve(target: Element) {
    this.targets = this.targets.filter((t) => t !== target)
  }
  disconnect() {
    this.targets = []
  }
  isObserved(target: Element) {
    return this.targets.includes(target)
  }
  trigger(target: Element, isIntersecting: boolean) {
    this.callback([{ target, isIntersecting } as unknown as IntersectionObserverEntry])
  }
}

describe('MoreItemsSpacer', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    FakeIntersectionObserver.instances = []
  })

  describe('when IntersectionObserver is supported', () => {
    beforeEach(() => {
      vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    })

    it('renders the invisible sentinel', async () => {
      const { wrapper } = await getWrapper()

      expect(wrapper.find(selectors.sentinel).exists()).toBeTruthy()
      expect(wrapper.find(selectors.showMore).exists()).toBeFalsy()
    })
    it('does not render anything when everything is loaded', async () => {
      const { wrapper } = await getWrapper({ allLoaded: true })

      expect(wrapper.find(selectors.sentinel).exists()).toBeFalsy()
      expect(wrapper.find(selectors.showMore).exists()).toBeFalsy()
    })
    it('emits loadMore when the sentinel becomes visible', async () => {
      const { wrapper, observer, sentinel } = await getWrapper()

      observer.trigger(sentinel, true)

      expect(emittedLoadMore(wrapper)).toBe(1)
      expect(observer.isObserved(sentinel)).toBe(false)
    })
    it('re-observes the sentinel on every recheck while it stays visible', async () => {
      let recheckKey = 100
      const { wrapper, observer } = await getWrapper({ recheckKey })
      let currentObserver = observer
      let currentSentinel = wrapper.find(selectors.sentinel).element

      for (let i = 0; i < 5; i++) {
        const previousSentinel = currentSentinel
        currentObserver.trigger(currentSentinel, true)
        expect(emittedLoadMore(wrapper)).toBe(i + 1)

        recheckKey += 100
        await wrapper.setProps({ recheckKey })

        currentSentinel = wrapper.find(selectors.sentinel).element
        currentObserver = FakeIntersectionObserver.instances.at(-1)
        expect(currentSentinel).not.toBe(previousSentinel)
        expect(currentObserver.isObserved(currentSentinel)).toBe(true)
      }
    })
    it('does not re-observe the sentinel when the recheck key is unchanged', async () => {
      const { wrapper, observer, sentinel } = await getWrapper({ recheckKey: 100 })

      observer.trigger(sentinel, true)
      await nextTick()

      expect(wrapper.find(selectors.sentinel).element).toBe(sentinel)
      expect(observer.isObserved(sentinel)).toBe(false)
      expect(emittedLoadMore(wrapper)).toBe(1)
    })
  })

  describe('when IntersectionObserver is not supported', () => {
    beforeEach(() => {
      vi.stubGlobal('IntersectionObserver', undefined)
    })

    it('renders a manual button instead of the sentinel', async () => {
      const { wrapper } = await getWrapper()

      expect(wrapper.find(selectors.showMore).exists()).toBeTruthy()
      expect(wrapper.find(selectors.sentinel).exists()).toBeFalsy()
    })
    it('emits loadMore when the button is clicked', async () => {
      const { wrapper } = await getWrapper()

      await wrapper.find(selectors.showMore).trigger('click')

      expect(emittedLoadMore(wrapper)).toBe(1)
    })
    it('does not render anything when everything is loaded', async () => {
      const { wrapper } = await getWrapper({ allLoaded: true })

      expect(wrapper.find(selectors.showMore).exists()).toBeFalsy()
    })
  })
})

async function getWrapper(propsData = {} as { allLoaded?: boolean; recheckKey?: PropertyKey }) {
  const wrapper = mount(MoreItemsSpacer, {
    props: propsData,
    global: {
      plugins: [...defaultPlugins()]
    }
  })
  /**
   * The observation starts lazily, wait for the scheduler so that the sentinel
   * is registered with the observer.
   */
  await nextTick()
  const sentinelWrapper = wrapper.find(selectors.sentinel)
  const sentinel = sentinelWrapper.exists() ? sentinelWrapper.element : null
  /**
   * The observer is cached by the design system for the given root and root
   * margin, so use the most recently created fake instance.
   */
  const observer = FakeIntersectionObserver.instances.at(-1)

  return { wrapper, observer, sentinel }
}
