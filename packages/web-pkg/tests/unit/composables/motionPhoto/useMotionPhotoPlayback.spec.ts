import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { MaybeRefOrGetter, ref, toValue } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useMotionPhotoPlayback } from '../../../../src/composables/motionPhoto/useMotionPhotoPlayback'

const mp4Body = () => new Blob([new Uint8Array(80)])
const space = mock<SpaceResource>()

const buildResource = (overrides: Partial<Resource> = {}) =>
  ({
    id: 'mp1',
    fileId: 'mp1',
    path: '/motion.jpg',
    size: 200000,
    motionPhoto: { videoSize: 120000, presentationTimestampUs: 500000 },
    ...overrides
  }) as unknown as Resource

function getWrapper(resource: MaybeRefOrGetter<Resource> = buildResource()) {
  const mocks = { ...defaultComponentMocks() }
  let instance: ReturnType<typeof useMotionPhotoPlayback>
  const wrapper = getComposableWrapper(
    () => {
      instance = useMotionPhotoPlayback(
        () => toValue(resource),
        () => space
      )
    },
    { mocks, provide: mocks }
  )
  return { instance, mocks, wrapper }
}

describe('useMotionPhotoPlayback', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:video')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('play() fetches the clip and sets playing state, stop() resets it', async () => {
    const { instance, mocks } = getWrapper()
    mocks.$clientService.webdav.getFileContents.mockResolvedValue({
      response: { status: 206 },
      body: mp4Body()
    })

    expect(instance.isPlaying.value).toBe(false)
    await instance.play()

    expect(instance.isPlaying.value).toBe(true)
    expect(instance.videoUrl.value).toBe('blob:video')
    expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledWith(
      space,
      { fileId: 'mp1', path: '/motion.jpg' },
      expect.objectContaining({ headers: { Range: 'bytes=80000-' } })
    )

    instance.stop()
    expect(instance.isPlaying.value).toBe(false)
  })

  it('toggle() flips playback', async () => {
    const { instance, mocks } = getWrapper()
    mocks.$clientService.webdav.getFileContents.mockResolvedValue({
      response: { status: 206 },
      body: mp4Body()
    })

    instance.toggle()
    await flushPromises()
    expect(instance.isPlaying.value).toBe(true)

    instance.toggle()
    expect(instance.isPlaying.value).toBe(false)
  })

  it('does not play when the resource is not a playable motion photo', async () => {
    const { instance, mocks } = getWrapper(buildResource({ motionPhoto: undefined }))
    expect(instance.canPlay.value).toBe(false)

    await instance.play()

    expect(instance.isPlaying.value).toBe(false)
    expect(mocks.$clientService.webdav.getFileContents).not.toHaveBeenCalled()
  })

  it('ignores a second play() while one is already in flight', async () => {
    const { instance, mocks } = getWrapper()
    mocks.$clientService.webdav.getFileContents.mockResolvedValue({
      response: { status: 206 },
      body: mp4Body()
    })

    const first = instance.play()
    const second = instance.play()
    await Promise.all([first, second])

    expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledTimes(1)
  })

  it('seekToStill sets the video currentTime to the still frame', () => {
    const { instance } = getWrapper()
    const video = { currentTime: 0 } as HTMLVideoElement
    instance.seekToStill({ target: video } as unknown as Event)
    expect(video.currentTime).toBeCloseTo(0.5)
  })

  it('reveals the loading spinner only after a short delay and clears it when done', async () => {
    vi.useFakeTimers()
    try {
      const { instance, mocks } = getWrapper()
      let resolveFetch: (value: unknown) => void
      mocks.$clientService.webdav.getFileContents.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve
        })
      )

      instance.play()
      // no spinner while the fetch is still fast
      expect(instance.isLoading.value).toBe(false)

      await vi.advanceTimersByTimeAsync(200)
      expect(instance.isLoading.value).toBe(true)

      resolveFetch({ response: { status: 206 }, body: mp4Body() })
      await vi.runAllTimersAsync()
      expect(instance.isLoading.value).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not show the spinner when playback is stopped before the delay elapses', async () => {
    vi.useFakeTimers()
    try {
      const { instance, mocks } = getWrapper()
      mocks.$clientService.webdav.getFileContents.mockReturnValue(new Promise(() => {}))

      instance.play()
      await vi.advanceTimersByTimeAsync(100)
      instance.stop()
      await vi.advanceTimersByTimeAsync(200)

      expect(instance.isLoading.value).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops playback when the resource changes (e.g. sidebar selection switch)', async () => {
    const resource = ref(buildResource())
    const { instance, mocks } = getWrapper(resource)
    mocks.$clientService.webdav.getFileContents.mockResolvedValue({
      response: { status: 206 },
      body: mp4Body()
    })

    await instance.play()
    expect(instance.isPlaying.value).toBe(true)

    resource.value = buildResource({ id: 'mp2', fileId: 'mp2' })
    await flushPromises()

    expect(instance.isPlaying.value).toBe(false)
  })
})
