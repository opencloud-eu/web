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
      callback: (args: unknown[], fastForward = 0) => {
        const observerMock = window.IntersectionObserver as any
        observerMock.mock.calls[0][0](args, observerMock.mock.instances[0])
        vi.advanceTimersByTime(fastForward)
      }
    }
  }

  const disable = () => {
    delete window.IntersectionObserver
  }

  return { enable, disable }
}

const createWrapper = (options = {}) =>
  mount(
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

const observerOptions = (call = 0) => (window.IntersectionObserver as any).mock.calls[call][1]

describe('useIsVisible', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
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

  it('re-creates the observer and unobserves the old target if the root changes', async () => {
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

  it('only shows once and then gets unobserved if the the composable is in the default show mode', async () => {
    const { unobserveMock, callback: observerCallback } = enableIntersectionObserver()
    const wrapper = createWrapper()

    await nextTick()
    expect((wrapper.vm.$refs.target as any).innerHTML).toBe('false')

    observerCallback([{ isIntersecting: true, target: wrapper.vm.$refs.target }])
    await nextTick()
    expect((wrapper.vm.$refs.target as any).innerHTML).toBe('true')
    expect(unobserveMock).toHaveBeenCalledTimes(1)
  })

  it('shows and hides multiple times if the the composable is in showHide mode', async () => {
    const { unobserveMock, callback: observerCallback } = enableIntersectionObserver()
    const wrapper = createWrapper({ mode: 'showHide' })

    await nextTick()
    expect((wrapper.vm.$refs.target as any).innerHTML).toBe('false')

    observerCallback([{ isIntersecting: true, target: wrapper.vm.$refs.target }])
    await nextTick()
    expect((wrapper.vm.$refs.target as any).innerHTML).toBe('true')
    expect(unobserveMock).toHaveBeenCalledTimes(0)
  })

  it('disconnects the observer before component gets unmounted', async () => {
    const { disconnectMock } = enableIntersectionObserver()
    const wrapper = createWrapper()

    expect(disconnectMock).toHaveBeenCalledTimes(0)
    await nextTick()
    wrapper.unmount()
    expect(disconnectMock).toHaveBeenCalledTimes(1)
  })
})
