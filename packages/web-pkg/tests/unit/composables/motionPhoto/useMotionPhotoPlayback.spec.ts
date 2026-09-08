import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { MaybeRefOrGetter, ref, toValue } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import type { GetFileContentsResponse } from '@opencloud-eu/web-client/webdav'
import {
  HOVER_INTENT_DELAY_MS,
  useMotionPhotoPlayback
} from '../../../../src/composables/motionPhoto/useMotionPhotoPlayback'

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
      let resolveFetch: (value: GetFileContentsResponse) => void
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
  it('a cancelled play() does not disturb the next one (stale run stays out of the state)', async () => {
    const { instance, mocks } = getWrapper()
    const first = Promise.withResolvers<GetFileContentsResponse>()
    const second = Promise.withResolvers<GetFileContentsResponse>()
    mocks.$clientService.webdav.getFileContents
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    const firstRun = instance.play()
    instance.stop()
    const secondRun = instance.play()
    expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledTimes(2)

    // the aborted first run settles late (rejects, as an aborted fetch would)
    first.reject(new DOMException('aborted', 'AbortError'))
    await firstRun
    await flushPromises()

    // the second run must still be cancelable: stop() aborts it, nothing plays
    instance.stop()
    second.resolve({ response: { status: 206 }, body: mp4Body() } as GetFileContentsResponse)
    await secondRun
    await flushPromises()
    expect(instance.isPlaying.value).toBe(false)
    expect(instance.videoUrl.value).toBeUndefined()
  })

  it('hoverPlay() waits for hover intent and is cancelled by stop()', () => {
    vi.useFakeTimers()
    try {
      const { instance, mocks } = getWrapper()
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 206 },
        body: mp4Body()
      })

      instance.hoverPlay()
      vi.advanceTimersByTime(HOVER_INTENT_DELAY_MS - 1)
      expect(mocks.$clientService.webdav.getFileContents).not.toHaveBeenCalled()
      instance.stop()
      vi.advanceTimersByTime(HOVER_INTENT_DELAY_MS)
      expect(mocks.$clientService.webdav.getFileContents).not.toHaveBeenCalled()

      instance.hoverPlay()
      vi.advanceTimersByTime(HOVER_INTENT_DELAY_MS)
      expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('revokes the previous clip when the resource changes', async () => {
    const resource = ref(buildResource())
    const { instance, mocks } = getWrapper(resource)
    mocks.$clientService.webdav.getFileContents.mockResolvedValue({
      response: { status: 206 },
      body: mp4Body()
    })
    await instance.play()
    expect(instance.videoUrl.value).toBe('blob:video')

    resource.value = buildResource({ id: 'mp2', fileId: 'mp2' })
    await flushPromises()

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:video')
    expect(instance.isPlaying.value).toBe(false)
    expect(instance.videoUrl.value).toBeUndefined()
  })
})
