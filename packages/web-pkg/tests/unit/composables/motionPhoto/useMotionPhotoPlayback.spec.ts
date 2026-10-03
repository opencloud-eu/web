import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { MaybeRefOrGetter, ref, toValue } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import type { GetFileContentsResponse, WebDAV } from '@opencloud-eu/web-client/webdav'
import {
  HOVER_INTENT_DELAY_MS,
  useMotionPhotoPlayback
} from '../../../../src/composables/motionPhoto/useMotionPhotoPlayback'

type SearchResult = Awaited<ReturnType<WebDAV['search']>>

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

const buildLivePhotoStill = (contentId: string) =>
  ({
    id: `still-${contentId}`,
    fileId: `still-${contentId}`,
    path: '/IMG_0001.HEIC',
    mimeType: 'image/heic',
    size: 200000,
    livePhoto: { contentId }
  }) as unknown as Resource

const buildLivePhotoVideo = (contentId: string, livePhoto: Partial<Resource['livePhoto']> = {}) =>
  ({
    id: `video-${contentId}`,
    fileId: `video-${contentId}`,
    path: '/IMG_0001.MOV',
    mimeType: 'video/quicktime',
    size: 300000,
    livePhoto: { contentId, stillImageTimeUs: 1250000, ...livePhoto }
  }) as unknown as Resource

const searchResult = (resources: Resource[] = []) =>
  ({ resources, totalResults: resources.length }) as SearchResult

function getWrapper(
  resource: MaybeRefOrGetter<Resource> = buildResource(),
  { resources = [] }: { resources?: Resource[] } = {}
) {
  const mocks = { ...defaultComponentMocks() }
  let instance: ReturnType<typeof useMotionPhotoPlayback>
  const wrapper = getComposableWrapper(
    () => {
      instance = useMotionPhotoPlayback(
        () => toValue(resource),
        () => space
      )
    },
    { mocks, provide: mocks, pluginOptions: { piniaOptions: { resourcesStore: { resources } } } }
  )
  return { instance, mocks, wrapper }
}

describe('useMotionPhotoPlayback', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:video')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('play() fetches the video and sets playing state, stop() resets it', async () => {
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

  it('revokes the previous video when the resource changes', async () => {
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

  describe('live photo', () => {
    it('plays the paired video of the current folder', async () => {
      const still = buildLivePhotoStill('playback-folder')
      const { instance, mocks } = getWrapper(still, {
        resources: [still, buildLivePhotoVideo('playback-folder')]
      })
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Body()
      })

      expect(instance.canPlay.value).toBe(true)
      await instance.play()

      expect(instance.isPlaying.value).toBe(true)
      expect(instance.videoUrl.value).toBe('blob:video')
    })

    it('becomes unavailable when no paired video exists and retries once that verdict expired', async () => {
      vi.useFakeTimers()
      try {
        const still = buildLivePhotoStill('playback-missing')
        const { instance, mocks } = getWrapper(still, { resources: [still] })
        mocks.$clientService.webdav.search.mockResolvedValue(searchResult([still]))

        expect(instance.canPlay.value).toBe(true)
        await instance.play()
        expect(instance.isPlaying.value).toBe(false)
        expect(instance.canPlay.value).toBe(false)

        await instance.play()
        expect(mocks.$clientService.webdav.search).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(30_000)
        expect(instance.canPlay.value).toBe(true)

        mocks.$clientService.webdav.search.mockResolvedValue(
          searchResult([buildLivePhotoVideo('playback-missing')])
        )
        mocks.$clientService.webdav.getFileContents.mockResolvedValue({
          response: { status: 200 },
          body: mp4Body()
        })
        await instance.play()
        expect(mocks.$clientService.webdav.search).toHaveBeenCalledTimes(2)
        expect(instance.isPlaying.value).toBe(true)
      } finally {
        vi.useRealTimers()
      }
    })

    it('keeps its verdict to itself, another player of the same live photo looks the video up on its own', async () => {
      const still = buildLivePhotoStill('playback-own-state')
      const first = getWrapper(still, { resources: [still] })
      first.mocks.$clientService.webdav.search.mockResolvedValue(searchResult([]))
      await first.instance.play()
      expect(first.instance.canPlay.value).toBe(false)

      const second = getWrapper(still, { resources: [still] })
      expect(second.instance.canPlay.value).toBe(true)
      second.mocks.$clientService.webdav.search.mockResolvedValue(
        searchResult([buildLivePhotoVideo('playback-own-state')])
      )
      second.mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Body()
      })
      await second.instance.play()

      expect(second.mocks.$clientService.webdav.search).toHaveBeenCalledTimes(1)
      expect(second.instance.isPlaying.value).toBe(true)
      expect(first.instance.canPlay.value).toBe(false)
    })

    it('forgets the paired video of the previous resource when the resource changes', async () => {
      const still = buildLivePhotoStill('playback-forget')
      const resource = ref(still)
      const { instance, mocks } = getWrapper(resource, { resources: [still] })
      mocks.$clientService.webdav.search.mockResolvedValue(
        searchResult([buildLivePhotoVideo('playback-forget')])
      )
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Body()
      })
      await instance.play()
      expect(mocks.$clientService.webdav.search).toHaveBeenCalledTimes(1)

      resource.value = buildResource()
      await flushPromises()
      resource.value = still
      await flushPromises()
      await instance.play()

      expect(mocks.$clientService.webdav.search).toHaveBeenCalledTimes(2)
    })

    it('leaves no timer behind when it is disposed while the video is unavailable', async () => {
      vi.useFakeTimers()
      try {
        const still = buildLivePhotoStill('playback-dispose')
        const { instance, mocks, wrapper } = getWrapper(still, { resources: [still] })
        mocks.$clientService.webdav.search.mockResolvedValue(searchResult([]))
        await instance.play()
        expect(instance.canPlay.value).toBe(false)

        wrapper.unmount()

        expect(vi.getTimerCount()).toBe(0)
      } finally {
        vi.useRealTimers()
      }
    })

    it('looks the paired video up again after its download failed', async () => {
      const still = buildLivePhotoStill('playback-gone')
      const { instance, mocks } = getWrapper(still, { resources: [still] })
      mocks.$clientService.webdav.search.mockResolvedValue(
        searchResult([buildLivePhotoVideo('playback-gone')])
      )
      mocks.$clientService.webdav.getFileContents.mockRejectedValueOnce(new Error('not found'))

      await instance.play()
      expect(instance.isPlaying.value).toBe(false)

      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Body()
      })
      await instance.play()

      expect(mocks.$clientService.webdav.search).toHaveBeenCalledTimes(2)
      expect(instance.isPlaying.value).toBe(true)
    })

    it('stays playable when the lookup is cancelled by stop()', async () => {
      const still = buildLivePhotoStill('playback-abort')
      const { instance, mocks } = getWrapper(still, { resources: [still] })
      const search = Promise.withResolvers<SearchResult>()
      mocks.$clientService.webdav.search.mockReturnValue(search.promise)

      const run = instance.play()
      const { signal } = mocks.$clientService.webdav.search.mock.calls[0][1]
      expect(signal.aborted).toBe(false)
      instance.stop()
      expect(signal.aborted).toBe(true)
      search.reject(new DOMException('aborted', 'AbortError'))
      await run

      expect(instance.isPlaying.value).toBe(false)
      expect(instance.canPlay.value).toBe(true)
    })

    it('stays playable and keeps the resolved video when the download is cancelled by stop()', async () => {
      const still = buildLivePhotoStill('playback-abort-download')
      const { instance, mocks } = getWrapper(still, { resources: [still] })
      mocks.$clientService.webdav.search.mockResolvedValue(
        searchResult([buildLivePhotoVideo('playback-abort-download')])
      )
      const download = Promise.withResolvers<GetFileContentsResponse>()
      mocks.$clientService.webdav.getFileContents.mockReturnValueOnce(download.promise)

      const run = instance.play()
      await flushPromises()
      instance.stop()
      download.reject(new DOMException('aborted', 'AbortError'))
      await run
      expect(instance.canPlay.value).toBe(true)

      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Body()
      })
      await instance.play()
      expect(instance.isPlaying.value).toBe(true)
      expect(mocks.$clientService.webdav.search).toHaveBeenCalledTimes(1)
    })

    it('becomes unavailable when the search itself fails', async () => {
      const still = buildLivePhotoStill('playback-search-error')
      const { instance, mocks } = getWrapper(still, { resources: [still] })
      mocks.$clientService.webdav.search.mockRejectedValue(new Error('search not available'))

      await instance.play()

      expect(instance.isPlaying.value).toBe(false)
      expect(instance.canPlay.value).toBe(false)
    })

    it('seekToStill uses the still image time of the paired video', async () => {
      const still = buildLivePhotoStill('playback-still-time')
      const { instance, mocks } = getWrapper(still, {
        resources: [still, buildLivePhotoVideo('playback-still-time')]
      })
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Body()
      })
      await instance.play()

      const video = { currentTime: 0, duration: 3 } as HTMLVideoElement
      instance.seekToStill({ target: video } as unknown as Event)
      expect(video.currentTime).toBeCloseTo(1.25)
    })

    it('seekToStill falls back to the middle of the video without a still image time', async () => {
      const still = buildLivePhotoStill('playback-no-still-time')
      const { instance, mocks } = getWrapper(still, {
        resources: [
          still,
          buildLivePhotoVideo('playback-no-still-time', { stillImageTimeUs: undefined })
        ]
      })
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Body()
      })
      await instance.play()

      const video = { currentTime: 0, duration: 3 } as HTMLVideoElement
      instance.seekToStill({ target: video } as unknown as Event)
      expect(video.currentTime).toBeCloseTo(1.5)
    })
  })
})
