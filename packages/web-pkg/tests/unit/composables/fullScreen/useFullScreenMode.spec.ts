import { defineComponent, h, ref, unref } from 'vue'
import { mount } from '@vue/test-utils'
import { useFullScreenMode } from '../../../../src/composables/fullScreen/useFullScreenMode'

function setup(target?: HTMLElement) {
  let result: ReturnType<typeof useFullScreenMode>
  const wrapper = mount(
    defineComponent({
      setup() {
        result = useFullScreenMode(target ? ref(target) : undefined)
        return () => h('div')
      }
    })
  )
  return { result, wrapper }
}

describe('useFullScreenMode', () => {
  let fullscreenElement: Element | null

  function setFullscreenElement(element: Element | null) {
    fullscreenElement = element
    document.dispatchEvent(new Event('fullscreenchange'))
  }

  beforeEach(() => {
    fullscreenElement = null
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement
    })
    document.exitFullscreen = vi.fn(() => {
      setFullscreenElement(null)
      return Promise.resolve()
    })
    HTMLElement.prototype.requestFullscreen = vi.fn(function (this: HTMLElement) {
      setFullscreenElement(this)
      return Promise.resolve()
    })
  })

  it('enters fullscreen on the document by default and leaves it again', async () => {
    const { result } = setup()

    await result.toggleFullScreenMode()
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled()
    expect(unref(result.isFullScreenModeActivated)).toBe(true)

    await result.toggleFullScreenMode()
    expect(document.exitFullscreen).toHaveBeenCalled()
    expect(unref(result.isFullScreenModeActivated)).toBe(false)
  })

  it('enters fullscreen on the given element', async () => {
    const target = document.createElement('div')
    const { result } = setup(target)

    await result.toggleFullScreenMode()

    expect(target.requestFullscreen).toHaveBeenCalled()
    expect(fullscreenElement).toBe(target)
  })

  it('ignores fullscreen of other elements, e.g. a native video player', () => {
    const { result } = setup()

    setFullscreenElement(document.createElement('video'))

    expect(unref(result.isFullScreenModeActivated)).toBe(false)
  })

  it('reflects fullscreen changes made by the browser', async () => {
    const { result, wrapper } = setup()
    await result.toggleFullScreenMode()

    fullscreenElement = null
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(unref(result.isFullScreenModeActivated)).toBe(false)

    wrapper.unmount()
    fullscreenElement = document.documentElement
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(unref(result.isFullScreenModeActivated)).toBe(false)
  })
})
