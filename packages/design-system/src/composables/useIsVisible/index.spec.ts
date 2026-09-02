import { ref, nextTick } from 'vue'
import { useIsVisible } from './index'
import { mount } from '@opencloud-eu/web-test-helpers'

const mockIntersectionObserver = () => {
  const enable = () => {
    const observeMock = vi.fn()
    const unobserveMock = vi.fn()
    const disconnectMock = vi.fn()
    window.IntersectionObserver = vi.fn(
      class {
        observe = observeMock
        unobserve = unobserveMock
        disconnect = disconnectMock
      }
    ) as any

    return {
      observeMock,
      unobserveMock,
      disconnectMock,
      instanceCount: () => (window.IntersectionObserver as any).mock.calls.length,
      callback: (entries: unknown[], fastForward = 0) => {
        ;(window.IntersectionObserver as any).mock.calls.at(-1)[0](entries)
        vi.advanceTimersByTime(fastForward)
      }
    }
  }

  const disable = () => {
    delete window.IntersectionObserver
  }

  return { enable, disable }
}

const wrappers: Array<{ unmount: () => void }> = []

const createWrapper = (options = {}) => {
  const wrapper = mount(
    {
      template: `<div ref="target">{{ isVisible }}</div>`,
      setup: () => {
        const target = ref<HTMLElement>()
        const { isVisible } = useIsVisible({
          root: ref(document.createElement('div')),
          ...options,
          target
        })

        return { isVisible, target }
      }
    },
    { attachTo: document.body }
  )
  wrappers.push(wrapper)
  return wrapper
}

const createListWrapper = (itemCount: number, options = {}) => {
  const wrapper = mount(
    {
      template: `
        <div>
        <div v-for="item in items" :key="item" :ref="(el) => setTarget(item, el)" data-item>
          {{ visibilities[item] }}
        </div>
        </div>`,
      setup: () => {
        const root = ref(document.createElement('div'))
        const items = Array.from({ length: itemCount }, (_, index) => index)
        const targets = items.map(() => ref<HTMLElement>())
        const visibilities = items.map(
          (item) => useIsVisible({ root, ...options, target: targets[item] }).isVisible
        )

        return {
          items,
          visibilities,
          setTarget: (item: number, el: HTMLElement) => (targets[item].value = el)
        }
      }
    },
    { attachTo: document.body }
  )
  wrappers.push(wrapper)
  return wrapper
}

const observerOptions = (call = 0) => (window.IntersectionObserver as any).mock.calls[call][1]

describe('useIsVisible', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    // unmounting releases the targets from the shared observer
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  const { enable: enableIntersectionObserver, disable: disableIntersectionObserver } =
    mockIntersectionObserver()

  it('is visible by default if browser does not support IntersectionObserver', () => {
    disableIntersectionObserver()
    const wrapper = createWrapper()
    expect((wrapper.vm.$refs.target as HTMLElement).innerHTML).toBe('true')
  })

  it('observes the target', async () => {
    const { observeMock } = enableIntersectionObserver()
    createWrapper()
    await nextTick()

    expect(observeMock).toHaveBeenCalledTimes(1)
  })

  it('does not create an observer before the target is mounted', () => {
    enableIntersectionObserver()
    createWrapper()

    expect(window.IntersectionObserver).not.toHaveBeenCalled()
  })

  it('uses a look-ahead of one root height by default', async () => {
    enableIntersectionObserver()
    createWrapper()
    await nextTick()

    expect(observerOptions().rootMargin).toBe('100% 0%')
  })

  it('uses the given root', async () => {
    enableIntersectionObserver()
    const root = document.createElement('div')
    createWrapper({ root: ref(root) })
    await nextTick()

    expect(observerOptions().root).toBe(root)
  })

  it('falls back to the viewport until the root resolves', async () => {
    enableIntersectionObserver()
    createWrapper({ root: ref<Element>(null) })
    await nextTick()

    expect(observerOptions().root).toBeNull()
  })

  it('moves to another observer and unobserves the old target if the root changes', async () => {
    const { unobserveMock, observeMock } = enableIntersectionObserver()
    const firstRoot = document.createElement('div')
    const secondRoot = document.createElement('div')
    const root = ref(firstRoot)
    const wrapper = createWrapper({ root })
    await nextTick()

    root.value = secondRoot
    await nextTick()

    expect(window.IntersectionObserver).toHaveBeenCalledTimes(2)
    expect(observerOptions(1).root).toBe(secondRoot)
    expect(observeMock).toHaveBeenCalledTimes(2)
    expect(unobserveMock).toHaveBeenCalledWith(wrapper.vm.$refs.target)
  })

  it('uses one shared observer for all targets of a list', async () => {
    const { observeMock, instanceCount } = enableIntersectionObserver()
    createListWrapper(10)
    await nextTick()

    expect(observeMock).toHaveBeenCalledTimes(10)
    expect(instanceCount()).toBe(1)
  })

  it('creates one observer per rootMargin', async () => {
    const { instanceCount } = enableIntersectionObserver()
    const root = ref(document.createElement('div'))
    createWrapper({ root, rootMargin: '0px' })
    createWrapper({ root, rootMargin: '100px' })
    await nextTick()

    expect(instanceCount()).toBe(2)
  })

  it('only notifies the target the entry belongs to', async () => {
    const { callback: observerCallback } = enableIntersectionObserver()
    const wrapper = createListWrapper(2)
    await nextTick()

    const [first, second] = wrapper.findAll('[data-item]')
    observerCallback([{ isIntersecting: true, target: first.element }])
    await nextTick()

    expect(first.text()).toBe('true')
    expect(second.text()).toBe('false')
  })

  it('only shows once and then gets unobserved if the the composable is in the default show mode', async () => {
    const { unobserveMock, callback: observerCallback } = enableIntersectionObserver()
    const wrapper = createWrapper()

    await nextTick()
    const target = wrapper.vm.$refs.target as HTMLElement
    expect(target.innerHTML).toBe('false')

    observerCallback([{ isIntersecting: true, target }])
    await nextTick()
    expect(target.innerHTML).toBe('true')
    expect(unobserveMock).toHaveBeenCalledTimes(1)
  })

  it('shows and hides multiple times if the the composable is in showHide mode', async () => {
    const { unobserveMock, callback: observerCallback } = enableIntersectionObserver()
    const wrapper = createWrapper({ mode: 'showHide' })

    await nextTick()
    const target = wrapper.vm.$refs.target as HTMLElement
    expect(target.innerHTML).toBe('false')

    observerCallback([{ isIntersecting: true, target }])
    await nextTick()
    expect(target.innerHTML).toBe('true')
    expect(unobserveMock).toHaveBeenCalledTimes(0)

    observerCallback([{ isIntersecting: false, target }])
    await nextTick()
    expect(target.innerHTML).toBe('false')
  })

  it('only takes the last entry per target into account', async () => {
    const { callback: observerCallback } = enableIntersectionObserver()
    const wrapper = createWrapper()

    await nextTick()
    const target = wrapper.vm.$refs.target as HTMLElement

    observerCallback([
      { isIntersecting: false, target },
      { isIntersecting: true, target }
    ])
    await nextTick()
    expect(target.innerHTML).toBe('true')
  })

  it('unobserves the target before the component gets unmounted', async () => {
    const { unobserveMock, disconnectMock } = enableIntersectionObserver()
    const wrapper = createWrapper({ mode: 'showHide' })
    await nextTick()

    expect(unobserveMock).toHaveBeenCalledTimes(0)
    wrapper.unmount()
    expect(unobserveMock).toHaveBeenCalledTimes(1)
    // the shared observer is disconnected once its last target is gone
    expect(disconnectMock).toHaveBeenCalledTimes(1)
  })
})
