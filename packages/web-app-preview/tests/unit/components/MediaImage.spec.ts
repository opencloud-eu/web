import MediaImage from '../../../src/components/Sources/MediaImage.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { flushPromises, VueWrapper } from '@vue/test-utils'
import { Resource } from '@opencloud-eu/web-client'
import { MediaFile } from '../../../src/helpers/types'
import Panzoom, { PanzoomOptions } from '@panzoom/panzoom'

// panzoom touches real DOM geometry which jsdom does not provide
const panzoom = {
  destroy: vi.fn(),
  setStyle: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  getScale: vi.fn(() => 1),
  getPan: vi.fn(() => ({ x: 0, y: 0 }))
}
vi.mock('@panzoom/panzoom', () => ({ default: vi.fn(() => panzoom) }))

const svgDataUrl = 'data:image/svg+xml;base64,PHN2Zy8+'

const mediaFile = (mimeType: string): MediaFile =>
  ({
    id: 'img1',
    name: 'image',
    url: mimeType === 'image/svg+xml' ? svgDataUrl : 'blob:image',
    ext: 'svg',
    mimeType,
    isVideo: false,
    isImage: true,
    isAudio: false,
    isMotionOrLivePhoto: false,
    isLoading: false,
    isError: false,
    resource: { id: 'img1' } as Resource
  }) as MediaFile

// the test DOM drops modifier keys passed to the WheelEvent constructor
function wheelEvent(deltaY: number, modifier: Partial<WheelEventInit> = {}) {
  const event = new WheelEvent('wheel', { deltaY })
  Object.entries(modifier).forEach(([key, value]) => {
    Object.defineProperty(event, key, { value })
  })
  return event
}

describe('MediaImage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    panzoom.getScale.mockReturnValue(1)
    panzoom.getPan.mockReturnValue({ x: 0, y: 0 })
  })

  describe('svg', () => {
    it('renders only an image of the svg, never its markup', () => {
      // inlined markup would share the page's document: scripts, global styles and
      // external loads. As an image the browser renders it in isolation.
      const { wrapper } = getWrapper('image/svg+xml')

      expect(wrapper.findAll('img')).toHaveLength(1)
      expect(wrapper.find('svg').exists()).toBe(false)
      const img = wrapper.find('img')
      expect(img.attributes('src')).toBe(svgDataUrl)
      expect(img.attributes('alt')).toBe('image')
      expect(img.attributes('data-id')).toBe('img1')
      // svgs without an intrinsic size (viewBox only) would otherwise render at the
      // browser's default size instead of fitting the stage
      expect(img.classes()).toEqual(expect.arrayContaining(['size-full', 'object-contain']))
    })

    it('can be zoomed and panned', async () => {
      const { wrapper } = getWrapper('image/svg+xml')
      await flushPromises()

      expect(Panzoom).toHaveBeenCalledWith(wrapper.find('img').element, expect.anything())
    })
  })

  it('leaves a raster image constrained to the stage via max-w/max-h', () => {
    const { wrapper } = getWrapper('image/png')

    const img = wrapper.find('img')
    expect(img.classes()).toEqual(expect.arrayContaining(['max-w-full', 'max-h-full']))
  })

  describe('rotation', () => {
    const stageSize = { width: 1000, height: 600 }

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    // the test DOM has no layout: the stage and the image get their sizes by hand
    function setStageSize(wrapper: VueWrapper, size: { width: number; height: number }) {
      Object.defineProperties(wrapper.element.parentElement, {
        clientWidth: { value: size.width, configurable: true },
        clientHeight: { value: size.height, configurable: true }
      })
    }

    function getRotatedWrapper(mimeType: string, imageSize: { width: number; height: number }) {
      const { wrapper } = getWrapper(mimeType)
      setStageSize(wrapper, stageSize)
      Object.defineProperties(wrapper.find('img').element, {
        offsetWidth: { value: imageSize.width },
        offsetHeight: { value: imageSize.height },
        // a viewBox-only svg of 4:3 reports its default natural size
        naturalWidth: { value: 200 },
        naturalHeight: { value: 150 }
      })
      return wrapper
    }

    function lastTransform() {
      const [, transform] = panzoom.setStyle.mock.calls.at(-1)
      const [, rotation, scale, x, y] = transform.match(
        /rotate\((.+)deg\) scale\((.+)\) translate\((.+)px, (.+)px\)/
      )
      return { rotation: Number(rotation), scale: Number(scale), x: Number(x), y: Number(y) }
    }

    it.each([
      ['a landscape raster image', 'image/png', { width: 800, height: 600 }],
      // the svg element fills the stage, its drawing is 800x600
      ['a landscape svg', 'image/svg+xml', stageSize]
    ])('fits %s into the stage after a quarter turn', async (_, mimeType, imageSize) => {
      const wrapper = getRotatedWrapper(mimeType, imageSize)
      await flushPromises()

      await wrapper.setProps({ currentImageRotation: 90 })

      const { rotation, scale } = lastTransform()
      expect(rotation).toBe(90)
      // turned, the 800x600 drawing is 600 wide and 800 high, the stage only 600 high
      expect(800 * scale).toBeCloseTo(stageSize.height)
      expect(600 * scale).toBeLessThanOrEqual(stageSize.width)
    })

    it('keeps the zoom and pan of a rotated image', async () => {
      const wrapper = getRotatedWrapper('image/png', { width: 800, height: 600 })
      await flushPromises()
      panzoom.getScale.mockReturnValue(2)
      panzoom.getPan.mockReturnValue({ x: 30, y: 0 })

      await wrapper.setProps({ currentImageRotation: 90 })

      const { scale, x, y } = lastTransform()
      expect(scale).toBeCloseTo(2 * 0.75)
      // the translation is scaled too, it still moves the image by the pan times the zoom
      expect(x * scale).toBeCloseTo(0)
      expect(y * scale).toBeCloseTo(-30 * 2)
    })

    it('does not scale an image that is turned back', async () => {
      const wrapper = getRotatedWrapper('image/png', { width: 800, height: 600 })
      await flushPromises()

      await wrapper.setProps({ currentImageRotation: 90 })
      await wrapper.setProps({ currentImageRotation: 180 })

      expect(lastTransform()).toEqual({ rotation: 180, scale: 1, x: 0, y: 0 })
    })

    it('fits a rotated image again when the stage changes size', async () => {
      // the test DOM has no ResizeObserver
      let onResize: ResizeObserverCallback
      const observe = vi.fn()
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: ResizeObserverCallback) {
            onResize = callback
          }
          observe = observe
          unobserve = vi.fn()
          disconnect = vi.fn()
        }
      )
      const wrapper = getRotatedWrapper('image/png', { width: 800, height: 600 })
      await flushPromises()
      expect(observe).toHaveBeenCalledWith(wrapper.element.parentElement, expect.anything())

      await wrapper.setProps({ currentImageRotation: 90 })
      setStageSize(wrapper, { width: 500, height: 400 })
      onResize([], undefined)

      // turned, the 800px wide image has to fit the 400px high stage
      expect(lastTransform().scale).toBeCloseTo(400 / 800)
    })
  })

  describe('mouse wheel zoom', () => {
    it.each([
      ['shift', { shiftKey: true }],
      ['ctrl', { ctrlKey: true }],
      ['meta', { metaKey: true }]
    ])('zooms with the %s key held', async (_, modifier) => {
      const { wrapper } = getWrapper('image/png')
      await flushPromises()

      wrapper.find('img').element.dispatchEvent(wheelEvent(-1, modifier))
      expect(panzoom.zoomIn).toHaveBeenCalledWith({ step: 0.1 })

      wrapper.find('img').element.dispatchEvent(wheelEvent(1, modifier))
      expect(panzoom.zoomOut).toHaveBeenCalledWith({ step: 0.1 })
    })

    it('does not zoom without a modifier key', async () => {
      const { wrapper } = getWrapper('image/png')
      await flushPromises()

      wrapper.find('img').element.dispatchEvent(wheelEvent(-1))

      expect(panzoom.zoomIn).not.toHaveBeenCalled()
      expect(panzoom.zoomOut).not.toHaveBeenCalled()
    })
  })

  it('ignores a deferred panzoom transform after unmount', async () => {
    const { wrapper } = getWrapper('image/png')
    await flushPromises()
    const { setTransform } = vi.mocked(Panzoom).mock.calls[0][1] as PanzoomOptions

    wrapper.unmount()

    expect(() =>
      setTransform(document.createElement('div'), { scale: 1, x: 0, y: 0 }, {})
    ).not.toThrow()
    expect(panzoom.setStyle).not.toHaveBeenCalled()
  })

  it.each(['image/svg+xml', 'image/heic'])(
    'reports a %s the browser cannot render',
    async (mimeType) => {
      const { wrapper } = getWrapper(mimeType)

      await wrapper.find('img').trigger('error')

      expect(wrapper.emitted('error')).toHaveLength(1)
    }
  )
})

function getWrapper(mimeType: string) {
  return {
    wrapper: shallowMount(MediaImage, {
      props: { file: mediaFile(mimeType), currentImageRotation: 0 },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
