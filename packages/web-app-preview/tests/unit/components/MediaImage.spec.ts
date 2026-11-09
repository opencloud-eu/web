import MediaImage from '../../../src/components/Sources/MediaImage.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { Resource } from '@opencloud-eu/web-client'
import { MediaFile } from '../../../src/helpers/types'
import Panzoom, { PanzoomOptions } from '@panzoom/panzoom'

// panzoom touches real DOM geometry which jsdom does not provide
const panzoom = {
  destroy: vi.fn(),
  setStyle: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  getScale: () => 1,
  getPan: () => ({ x: 0, y: 0 })
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
