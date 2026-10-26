import MediaImage from '../../../src/components/Sources/MediaImage.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { Resource } from '@opencloud-eu/web-client'
import { MediaFile } from '../../../src/helpers/types'

// panzoom touches real DOM geometry which jsdom does not provide
const panzoom = {
  destroy: vi.fn(),
  setStyle: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  getScale: () => 1,
  getPan: () => ({ x: 0, y: 0 })
}
vi.mock('@panzoom/panzoom', () => ({ default: () => panzoom }))

const mediaFile = (mimeType: string): MediaFile =>
  ({
    id: 'img1',
    name: 'image',
    url: 'blob:image',
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

  it('fits an svg to the stage: stage-sized wrapper and a size-full svg', () => {
    // the wrapper must have a size so the svg can scale to it instead of
    // overflowing (large svg) or collapsing to 0x0 (viewBox-only svg)
    const { wrapper } = getWrapper('image/svg+xml')

    const svgWrapper = wrapper.find(`[data-id="img1"]`)
    expect(svgWrapper.classes()).toContain('size-full')

    const svg = wrapper.find('inline-svg-stub')
    expect(svg.exists()).toBe(true)
    expect(svg.classes()).toContain('size-full')
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

  it('reports an image the browser cannot decode', async () => {
    const { wrapper } = getWrapper('image/heic')

    await wrapper.find('img').trigger('error')

    expect(wrapper.emitted('error')).toHaveLength(1)
  })
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
