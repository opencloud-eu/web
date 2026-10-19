import { Location } from 'epubjs'
import { nextTick, shallowRef } from 'vue'
import { useBookContainerResize } from '../../../src/composables/useBookContainerResize'
import { createLocation, createRenditionMock, mountComposable } from '../mocks'

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  constructor(public callback: ResizeObserverCallback) {
    ResizeObserverMock.instances.push(this)
  }
  triggerResize() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

function setup() {
  const rendition = shallowRef(createRenditionMock() as any)
  const location = shallowRef<Location | undefined>()
  const container = shallowRef(document.createElement('div'))
  const { wrapper } = mountComposable(() =>
    useBookContainerResize({ rendition, location, container })
  )
  return { rendition, location, container, wrapper }
}

describe('useBookContainerResize', () => {
  beforeEach(() => {
    ResizeObserverMock.instances = []
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('observes the container once the first page is displayed', async () => {
    const { location, container } = setup()
    expect(ResizeObserverMock.instances).toHaveLength(0)

    location.value = createLocation()
    await nextTick()

    expect(ResizeObserverMock.instances).toHaveLength(1)
    expect(ResizeObserverMock.instances[0].observe).toHaveBeenCalledWith(container.value)

    location.value = createLocation({ cfi: 'next' })
    await nextTick()
    expect(ResizeObserverMock.instances).toHaveLength(1)
  })

  it('relayouts the book right away and throttles further resizes', async () => {
    const { rendition, location } = setup()
    location.value = createLocation()
    await nextTick()
    const [observer] = ResizeObserverMock.instances

    observer.triggerResize()
    expect(rendition.value.resize).toHaveBeenCalledTimes(1)
    expect(rendition.value.resize).toHaveBeenCalledWith(undefined, undefined)

    observer.triggerResize()
    expect(rendition.value.resize).toHaveBeenCalledTimes(1)

    vi.runAllTimers()
    expect(rendition.value.resize).toHaveBeenCalledTimes(2)
  })

  it('stops observing when the rendition goes away', async () => {
    const { rendition, location } = setup()
    location.value = createLocation()
    await nextTick()
    const [observer] = ResizeObserverMock.instances
    const previousRendition = rendition.value
    observer.triggerResize()
    observer.triggerResize()

    rendition.value = undefined
    location.value = undefined
    await nextTick()
    vi.runAllTimers()

    expect(observer.disconnect).toHaveBeenCalled()
    expect(previousRendition.resize).toHaveBeenCalledTimes(1)
  })

  it('disconnects on unmount', async () => {
    const { location, wrapper } = setup()
    location.value = createLocation()
    await nextTick()

    wrapper.unmount()

    expect(ResizeObserverMock.instances[0].disconnect).toHaveBeenCalled()
  })
})
