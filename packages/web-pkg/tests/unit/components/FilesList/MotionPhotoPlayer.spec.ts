import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import MotionPhotoPlayer from '../../../../src/components/FilesList/MotionPhotoPlayer.vue'
import { HOVER_INTENT_DELAY_MS } from '../../../../src/composables/motionPhoto'

const space = mock<SpaceResource>()

const motionPhotoResource = (motionPhoto: unknown = { videoSize: 120000 }) =>
  ({
    id: 'mp1',
    fileId: 'mp1',
    path: '/motion.jpg',
    size: 200000,
    motionPhoto
  }) as unknown as Resource

const livePhotoStill = (contentId: string) =>
  ({
    id: `still-${contentId}`,
    fileId: `still-${contentId}`,
    path: '/IMG_0001.HEIC',
    mimeType: 'image/heic',
    size: 200000,
    livePhoto: { contentId }
  }) as unknown as Resource

const livePhotoVideo = (contentId: string) =>
  ({
    id: `video-${contentId}`,
    fileId: `video-${contentId}`,
    path: '/IMG_0001.MOV',
    mimeType: 'video/quicktime',
    size: 300000,
    livePhoto: { contentId, stillImageTimeUs: 1250000 }
  }) as unknown as Resource

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

describe('MotionPhotoPlayer', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:player-video')
    global.URL.revokeObjectURL = vi.fn()
    stubMatchMedia()
  })

  it('is pointer-transparent apart from its badge', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.classes()).toContain('pointer-events-none')
    expect(wrapper.find('.motion-photo-badge').classes()).toContain('pointer-events-auto')
  })

  it('shows an interactive play badge and no video until playback starts', () => {
    const { wrapper } = getWrapper()
    const badge = wrapper.find('.motion-photo-badge')
    expect(badge.element.tagName).toBe('BUTTON')
    expect(badge.attributes('aria-label')).toBe('Play Motion Photo')
    expect(wrapper.find('video').exists()).toBe(false)
  })

  it('greys the badge out and explains when the video is not playable', async () => {
    const { wrapper, mocks } = getWrapper({ resource: motionPhotoResource({ videoSize: 500000 }) })
    const badge = wrapper.find('.motion-photo-badge')
    expect(badge.element.tagName).toBe('SPAN')
    expect(badge.classes()).toContain('opacity-50')
    expect(badge.attributes('aria-label')).toBe('Motion Photo (video not available)')

    ;(wrapper.vm as unknown as { hoverPlay: () => void }).hoverPlay()
    await flushPromises()
    expect(mocks.$clientService.webdav.getFileContents).not.toHaveBeenCalled()
  })

  it('toggles playback via the badge', async () => {
    const { wrapper, mocks } = getWrapper()

    await wrapper.find('.motion-photo-badge').trigger('click')
    await flushPromises()
    expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledWith(
      space,
      { fileId: 'mp1', path: '/motion.jpg' },
      expect.objectContaining({ headers: { Range: 'bytes=80000-' } })
    )
    expect(wrapper.find('video').attributes('src')).toBe('blob:player-video')
    expect(wrapper.find('.motion-photo-badge').attributes('aria-label')).toBe('Pause Motion Photo')

    await wrapper.find('.motion-photo-badge').trigger('click')
    expect(wrapper.find('video').exists()).toBe(false)
  })

  it('plays after the hover intent delay through the exposed hoverPlay/stop', async () => {
    vi.useFakeTimers()
    const { wrapper, mocks } = getWrapper()
    const vm = wrapper.vm as unknown as { hoverPlay: () => void; stop: () => void }

    vm.hoverPlay()
    vi.advanceTimersByTime(HOVER_INTENT_DELAY_MS)
    vi.useRealTimers()
    await flushPromises()
    expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledTimes(1)
    expect(wrapper.find('video').exists()).toBe(true)

    vm.stop()
    await flushPromises()
    expect(wrapper.find('video').exists()).toBe(false)
  })

  describe('live photo', () => {
    it('labels the badge as a live photo and plays the paired video', async () => {
      const still = livePhotoStill('player-play')
      const { wrapper, mocks } = getWrapper({
        resource: still,
        resources: [still, livePhotoVideo('player-play')]
      })
      const badge = wrapper.find('.motion-photo-badge')
      expect(badge.element.tagName).toBe('BUTTON')
      expect(badge.attributes('aria-label')).toBe('Play Live Photo')

      await badge.trigger('click')
      await flushPromises()

      expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledWith(
        space,
        { fileId: 'video-player-play' },
        expect.anything()
      )
      expect(wrapper.find('video').attributes('src')).toBe('blob:player-video')
      expect(wrapper.find('.motion-photo-badge').attributes('aria-label')).toBe('Pause Live Photo')
    })

    it('greys the badge out and explains when the paired video cannot be found', async () => {
      const still = livePhotoStill('player-missing')
      const { wrapper, mocks } = getWrapper({ resource: still, resources: [still] })
      mocks.$clientService.webdav.search.mockResolvedValue({ resources: [], totalResults: 0 })

      await wrapper.find('.motion-photo-badge').trigger('click')
      await flushPromises()

      const badge = wrapper.find('.motion-photo-badge')
      expect(badge.element.tagName).toBe('SPAN')
      expect(badge.classes()).toContain('opacity-50')
      expect(badge.attributes('aria-label')).toBe('Live Photo (video not available)')
      expect(wrapper.find('video').exists()).toBe(false)
    })
  })

  function getWrapper({
    resource = motionPhotoResource(),
    resources = []
  }: { resource?: Resource; resources?: Resource[] } = {}) {
    const mocks = defaultComponentMocks()
    mocks.$clientService.webdav.getFileContents.mockResolvedValue({
      response: { status: 206 },
      body: new Blob([new Uint8Array(80)])
    })
    return {
      mocks,
      wrapper: mount(MotionPhotoPlayer, {
        props: { resource, space },
        global: {
          plugins: [...defaultPlugins({ piniaOptions: { resourcesStore: { resources } } })],
          mocks,
          provide: mocks
        }
      })
    }
  }
})
