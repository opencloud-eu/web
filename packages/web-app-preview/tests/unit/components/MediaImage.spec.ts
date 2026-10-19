import MediaImage from '../../../src/components/Sources/MediaImage.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { Resource } from '@opencloud-eu/web-client'
import { MediaFile } from '../../../src/helpers/types'

// panzoom touches real DOM geometry which jsdom does not provide
vi.mock('@panzoom/panzoom', () => ({
  default: () => ({
    destroy: vi.fn(),
    setStyle: vi.fn(),
    getScale: () => 1,
    getPan: () => ({ x: 0, y: 0 })
  })
}))

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

describe('MediaImage component', () => {
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
