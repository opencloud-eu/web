import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import MotionPhotoOverlay from '../../../../src/components/FilesList/MotionPhotoOverlay.vue'

const space = mock<SpaceResource>()

const motionPhotoResource = () =>
  ({
    id: 'mp1',
    fileId: 'mp1',
    path: '/motion.jpg',
    size: 200000,
    motionPhoto: { videoSize: 120000, presentationTimestampUs: 0 }
  }) as unknown as Resource

// useMediaQuery('(hover: hover)') gates hover-to-play; report a hover-capable device
function stubMatchMedia(hover = true) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('hover: hover') ? hover : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
}

describe('MotionPhotoOverlay', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:overlay-video')
    global.URL.revokeObjectURL = vi.fn()
    stubMatchMedia()
  })

  it('renders the still slot and the badge with the play icon, no video initially', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('.still').exists()).toBe(true)
    const badge = wrapper.find('.motion-photo-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.attributes('aria-label')).toBe('Play motion photo')
    expect(wrapper.find('video').exists()).toBe(false)
  })

  it('renders the still but no badge when the resource has no motion photo facet', () => {
    const { wrapper } = getWrapper({ resource: mock<Resource>({ motionPhoto: undefined }) })
    expect(wrapper.find('.still').exists()).toBe(true)
    expect(wrapper.find('.motion-photo-badge').exists()).toBe(false)
  })

  it('plays on hover and stops on leave', async () => {
    const { wrapper, mocks } = getWrapper()

    await wrapper.trigger('mouseenter')
    await flushPromises()

    expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledWith(
      space,
      { fileId: 'mp1', path: '/motion.jpg' },
      expect.objectContaining({ headers: { Range: 'bytes=80000-' } })
    )
    const video = wrapper.find('video')
    expect(video.exists()).toBe(true)
    expect(video.attributes('src')).toBe('blob:overlay-video')
    expect(wrapper.find('.motion-photo-badge').attributes('aria-label')).toBe('Pause motion photo')

    await wrapper.trigger('mouseleave')
    await flushPromises()
    expect(wrapper.find('video').exists()).toBe(false)
  })

  it('does not play on hover on a non-hover (touch) device', async () => {
    stubMatchMedia(false)
    const { wrapper, mocks } = getWrapper()

    await wrapper.trigger('mouseenter')
    await flushPromises()

    expect(mocks.$clientService.webdav.getFileContents).not.toHaveBeenCalled()
    expect(wrapper.find('video').exists()).toBe(false)
  })

  it('toggles playback on badge click (touch / no hover)', async () => {
    stubMatchMedia(false)
    const { wrapper } = getWrapper()

    await wrapper.find('.motion-photo-badge').trigger('click')
    await flushPromises()
    expect(wrapper.find('video').exists()).toBe(true)

    await wrapper.find('.motion-photo-badge').trigger('click')
    expect(wrapper.find('video').exists()).toBe(false)
  })

  function getWrapper({ resource = motionPhotoResource() }: { resource?: Resource } = {}) {
    const mocks = defaultComponentMocks()
    mocks.$clientService.webdav.getFileContents.mockResolvedValue({
      response: { status: 206 },
      body: new Blob([new Uint8Array(80)])
    })
    return {
      mocks,
      wrapper: mount(MotionPhotoOverlay, {
        props: { resource, space },
        slots: { default: '<div class="still" />' },
        global: {
          plugins: [...defaultPlugins()],
          mocks,
          provide: mocks
        }
      })
    }
  }
})
