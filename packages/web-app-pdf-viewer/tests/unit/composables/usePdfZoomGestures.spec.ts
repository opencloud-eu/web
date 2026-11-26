import { ref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfZoomGestures } from '../../../src/composables/usePdfZoomGestures'

const mounted: { unmount: () => void }[] = []

const { TouchManager } = vi.hoisted(() => ({ TouchManager: vi.fn() }))
vi.mock('pdfjs-dist', async (importOriginal) => ({
  ...(await importOriginal<typeof import('pdfjs-dist')>()),
  TouchManager
}))

// happy-dom ignores the init values of WheelEvent.
function wheel(init: {
  deltaY: number
  deltaMode?: number
  ctrlKey?: boolean
  clientX?: number
  clientY?: number
}) {
  const event = new Event('wheel', { cancelable: true, bubbles: true })
  const defaults = { ctrlKey: false, metaKey: false, deltaX: 0, deltaZ: 0, deltaMode: 0 }
  for (const [key, value] of Object.entries({ ...defaults, ...init })) {
    Object.defineProperty(event, key, { value })
  }
  return event
}

function setup({ isPresenting = false } = {}) {
  const root = document.createElement('div')
  const container = document.createElement('div')
  root.append(container)
  document.body.append(root)
  const zoomAt = vi.fn()
  const panBy = vi.fn()
  const wrapper = getComposableWrapper(() =>
    usePdfZoomGestures({
      root: ref(root),
      container: ref(container),
      isPresenting,
      scale: 1,
      zoomAt,
      panBy
    })
  )
  mounted.push(wrapper)
  return { container, zoomAt, panBy }
}

describe('usePdfZoomGestures', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
    document.body.innerHTML = ''
  })

  it('leaves the mouse wheel to the presentation mode while presenting', () => {
    const { container, zoomAt } = setup({ isPresenting: true })
    container.dispatchEvent(
      wheel({ deltaY: -100, deltaMode: 1, ctrlKey: true, clientX: 0, clientY: 0 })
    )
    expect(zoomAt).not.toHaveBeenCalled()
  })

  it('zooms around the pointer in steps with ctrl + mouse wheel', () => {
    const { container, zoomAt } = setup()
    const event = wheel({ deltaY: -100, deltaMode: 1, ctrlKey: true, clientX: 10, clientY: 20 })
    container.dispatchEvent(event)
    container.dispatchEvent(
      wheel({ deltaY: 3, deltaMode: 1, ctrlKey: true, clientX: 0, clientY: 0 })
    )
    container.dispatchEvent(wheel({ deltaY: 100, deltaMode: 1 }))
    expect(zoomAt.mock.calls).toEqual([
      [{ steps: 1 }, [10, 20]],
      [{ steps: -1 }, [0, 0]]
    ])
    expect(event.defaultPrevented).toBe(true)
  })

  // Trackpads send many small events per pinch, each one a zoom step would be far too fast.
  it('zooms continuously when pinching, like the PDF.js viewer', () => {
    const { container, zoomAt } = setup()
    for (let i = 0; i < 10; i++) {
      container.dispatchEvent(wheel({ deltaY: -2, ctrlKey: true }))
    }
    const factor = zoomAt.mock.calls.reduce((total, [{ scaleFactor }]) => total * scaleFactor, 1)
    expect(factor).toBeCloseTo(1.22, 1)
  })

  // With the key pressed it's the mouse wheel, also in small pixel steps.
  it('zooms in steps while the Ctrl key is pressed', () => {
    const { container, zoomAt } = setup()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }))
    for (let i = 0; i < 16; i++) {
      container.dispatchEvent(wheel({ deltaY: -2, ctrlKey: true }))
    }
    expect(zoomAt.mock.calls).toEqual([[{ steps: 1 }, [undefined, undefined]]])
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }))
  })

  it('zooms the pages when pinching on touch screens, like the PDF.js viewer', () => {
    const { zoomAt, panBy } = setup()
    const { onPinching, onPanning } = TouchManager.mock.lastCall[0]
    onPinching([10, 20], 100, 150, 1, 2)
    expect(zoomAt).toHaveBeenCalledWith({ scaleFactor: 1.5 }, [10, 20], [1, 2])
    onPanning(3, 4)
    expect(panBy).toHaveBeenCalledWith(3, 4)
  })
})
