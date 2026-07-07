import MediaMotionPhoto from '../../../src/components/Sources/MediaMotionPhoto.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { MediaFile } from '../../../src/helpers/types'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useGetMatchingSpace: () => ({ getMatchingSpace: () => mock<SpaceResource>() })
}))

const mediaFile = (motionPhoto: unknown = { videoSize: 120000, presentationTimestampUs: 0 }) =>
  ({
    id: 'mp1',
    name: 'motion.jpg',
    url: 'blob:still',
    ext: 'jpg',
    mimeType: 'image/jpeg',
    isVideo: false,
    isImage: true,
    isAudio: false,
    isMotionPhoto: true,
    isLoading: false,
    isError: false,
    resource: {
      id: 'mp1',
      fileId: 'mp1',
      path: '/motion.jpg',
      size: 200000,
      motionPhoto
    } as unknown as Resource
  }) as MediaFile

describe('MediaMotionPhoto component', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:video')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('shows the still image and auto-plays the embedded video once on mount', async () => {
    const { wrapper, mocks } = getWrapper()
    expect(wrapper.find('img').exists()).toBe(true)

    await flushPromises()

    expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalled()
    const video = wrapper.find('[data-testid="motion-photo-video"]')
    expect(video.exists()).toBe(true)
    // the initial auto-play does not loop
    expect(video.attributes('loop')).toBeUndefined()
  })

  it('reverts to the still when the initial auto-play ends', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="motion-photo-video"]').trigger('ended')

    expect(wrapper.find('[data-testid="motion-photo-video"]').exists()).toBe(false)
  })

  it('loops on explicit toggle and keeps playing on ended', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()
    // let the initial auto-play finish
    await wrapper.find('[data-testid="motion-photo-video"]').trigger('ended')
    expect(wrapper.find('[data-testid="motion-photo-video"]').exists()).toBe(false)

    // explicit playback via the exposed toggle (driven by the media controls)
    ;(wrapper.vm as unknown as { toggle: () => void }).toggle()
    await flushPromises()

    const video = wrapper.find('[data-testid="motion-photo-video"]')
    expect(video.exists()).toBe(true)
    expect(video.attributes('loop')).toBeDefined()
    // ended must not stop it while looping
    await video.trigger('ended')
    expect(wrapper.find('[data-testid="motion-photo-video"]').exists()).toBe(true)
  })

  it('stays a still image when the video cannot be located', async () => {
    // videoSize larger than the file -> negative offset -> not playable
    const { wrapper, mocks } = getWrapper({ file: mediaFile({ videoSize: 500000 }) })
    await flushPromises()

    expect(mocks.$clientService.webdav.getFileContents).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="motion-photo-video"]').exists()).toBe(false)
    expect(wrapper.find('img').isVisible()).toBe(true)
  })
})

function getWrapper({
  file = mediaFile(),
  body = new Blob([new Uint8Array(80)]),
  status = 206
}: { file?: MediaFile; body?: Blob; status?: number } = {}) {
  const mocks = defaultComponentMocks()
  mocks.$clientService.webdav.getFileContents.mockResolvedValue({ response: { status }, body })
  return {
    mocks,
    wrapper: shallowMount(MediaMotionPhoto, {
      props: { file },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
