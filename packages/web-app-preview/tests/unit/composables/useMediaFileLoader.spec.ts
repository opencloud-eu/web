import { ref, unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import {
  defaultComponentMocks,
  getComposableWrapper,
  useGetMatchingSpaceMock
} from '@opencloud-eu/web-test-helpers'
import { useGetMatchingSpace } from '@opencloud-eu/web-pkg'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { useMediaFileLoader } from '../../../src/composables'
import { MediaFile } from '../../../src/helpers/types'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useGetMatchingSpace: vi.fn()
}))

/**
 * Records every instance so warm-ups can be settled by hand. `autoLoad` mirrors a
 * browser that fetches and decodes an image without further interaction.
 */
class MockImage {
  static instances: MockImage[] = []
  static autoLoad = true

  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private currentSrc = ''

  constructor() {
    MockImage.instances.push(this)
  }

  get src() {
    return this.currentSrc
  }

  set src(value: string) {
    this.currentSrc = value
    if (MockImage.autoLoad) {
      queueMicrotask(() => this.onload?.())
    }
  }

  triggerLoad = () => this.onload?.()
  triggerError = () => this.onerror?.()
}

const space = mock<SpaceResource>()

const createFile = (overrides: Partial<MediaFile> = {}): MediaFile => {
  const name = overrides.name ?? 'bear.png'
  return {
    id: name,
    name,
    ext: 'png',
    mimeType: 'image/png',
    isVideo: false,
    isImage: true,
    isAudio: false,
    isMotionPhoto: false,
    isLoading: true,
    isError: false,
    resource: mock<Resource>({ id: name, name, etag: `etag-${name}`, isInVault: false }),
    ...overrides
  } as MediaFile
}

const createFiles = (files: Partial<MediaFile>[]) => files.map((file) => createFile(file))

type CreateWrapperOptions = {
  files?: Partial<MediaFile>[]
  activeIndex?: number
}

function createWrapper({ files = [createFile()], activeIndex = 0 }: CreateWrapperOptions = {}) {
  const mocks = defaultComponentMocks()
  mocks.$previewService.loadPreview.mockImplementation(({ resource }) =>
    Promise.resolve(`preview-url-${resource.name}`)
  )

  const mediaFiles = ref(files.map((file) => createFile(file)))
  const index = ref(activeIndex)
  const getUrlForResource = vi.fn().mockResolvedValue('full-url')

  const wrapper = getComposableWrapper(
    () => ({ loader: useMediaFileLoader({ mediaFiles, activeIndex: index, getUrlForResource }) }),
    { mocks, provide: mocks }
  )

  return {
    wrapper,
    mediaFiles,
    activeIndex: index,
    getUrlForResource,
    mocks,
    loader: (wrapper.vm as unknown as { loader: ReturnType<typeof useMediaFileLoader> }).loader
  }
}

/** MediaFiles are reactive proxies once held in a ref, always address them via the ref. */
const requestedNames = (mocks: ReturnType<typeof defaultComponentMocks>) =>
  mocks.$previewService.loadPreview.mock.calls.map(([{ resource }]) => resource.name)

const signalsOf = (mocks: ReturnType<typeof defaultComponentMocks>) =>
  mocks.$previewService.loadPreview.mock.calls.map((call) => call[3] as AbortSignal)

describe('useMediaFileLoader', () => {
  beforeEach(() => {
    MockImage.instances = []
    MockImage.autoLoad = true
    vi.stubGlobal('Image', MockImage)
    vi.mocked(useGetMatchingSpace).mockReturnValue(
      useGetMatchingSpaceMock({ getMatchingSpace: () => space })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('method "loadPreviewImage"', () => {
    it('does not load a file that already has a url', async () => {
      const { wrapper, loader, mocks } = createWrapper()

      await loader.loadPreviewImage(createFile({ url: 'existing-url' }))

      expect(mocks.$previewService.loadPreview).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('resolves the url and clears the loading state', async () => {
      const { wrapper, loader, mediaFiles } = createWrapper()
      const mediaFile = unref(mediaFiles)[0]

      await loader.loadPreviewImage(mediaFile)

      expect(mediaFile.url).toBe('preview-url-bear.png')
      expect(mediaFile.isLoading).toBe(false)
      expect(mediaFile.isError).toBe(false)
      wrapper.unmount()
    })

    it('joins an in-flight request instead of issuing a second one', async () => {
      const { wrapper, loader, mocks, mediaFiles } = createWrapper()
      const mediaFile = unref(mediaFiles)[0]
      let resolvePreview: (url: string) => void
      mocks.$previewService.loadPreview.mockImplementationOnce(
        () => new Promise((resolve) => (resolvePreview = resolve))
      )

      const first = loader.loadPreviewImage(mediaFile)
      const second = loader.loadPreviewImage(mediaFile)
      resolvePreview('preview-url')
      await Promise.all([first, second])

      expect(mocks.$previewService.loadPreview).toHaveBeenCalledTimes(1)
      expect(mediaFile.url).toBe('preview-url')
      wrapper.unmount()
    })

    it('marks the file as errored when the request fails', async () => {
      const { wrapper, loader, mocks, mediaFiles } = createWrapper()
      const mediaFile = unref(mediaFiles)[0]
      mocks.$previewService.loadPreview.mockRejectedValueOnce(new Error('failed'))
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      await loader.loadPreviewImage(mediaFile)

      expect(mediaFile.isError).toBe(true)
      expect(mediaFile.isLoading).toBe(false)
      consoleError.mockRestore()
      wrapper.unmount()
    })

    it('leaves an aborted request loading so it retries when navigated to', async () => {
      const { wrapper, loader, mocks, mediaFiles } = createWrapper()
      const mediaFile = unref(mediaFiles)[0]
      mocks.$previewService.loadPreview.mockImplementation(() => new Promise(() => undefined))

      loader.loadPreviewImage(mediaFile)
      await flushPromises()
      wrapper.unmount()
      await flushPromises()

      expect(mediaFile.isLoading).toBe(true)
      expect(mediaFile.isError).toBe(false)
      expect(mediaFile.url).toBeUndefined()
    })

    it('clears a stale error state once the file loads successfully', async () => {
      const { wrapper, loader } = createWrapper()
      const mediaFile = createFile({ isError: true })

      await loader.loadPreviewImage(mediaFile)

      expect(mediaFile.isError).toBe(false)
      expect(mediaFile.url).toBe('preview-url-bear.png')
      wrapper.unmount()
    })

    it('resolves the space of the file being loaded', async () => {
      const { wrapper, loader, mocks } = createWrapper()

      await loader.loadPreviewImage(createFile())

      expect(mocks.$previewService.loadPreview).toHaveBeenCalledWith(
        expect.objectContaining({ space }),
        expect.anything(),
        expect.anything(),
        expect.anything()
      )
      wrapper.unmount()
    })

    it('uses getUrlForResource for vault images and svg files', async () => {
      const { wrapper, loader, mocks, getUrlForResource } = createWrapper()

      await loader.loadPreviewImage(createFile({ resource: mock<Resource>({ isInVault: true }) }))
      await loader.loadPreviewImage(createFile({ name: 'logo.svg', mimeType: 'image/svg+xml' }))

      expect(getUrlForResource).toHaveBeenCalledTimes(2)
      expect(mocks.$previewService.loadPreview).not.toHaveBeenCalled()
      wrapper.unmount()
    })
  })

  describe('method "preloadNeighbors"', () => {
    it('loads the forward neighbor first and the backward one once it settled', async () => {
      const { wrapper, loader, mocks } = createWrapper({
        files: createFiles([
          { name: 'a.png' },
          { name: 'b.png' },
          { name: 'c.png' },
          { name: 'd.png' }
        ]),
        activeIndex: 1
      })
      let resolvePreview: (url: string) => void
      mocks.$previewService.loadPreview.mockImplementationOnce(
        () => new Promise((resolve) => (resolvePreview = resolve))
      )

      loader.preloadNeighbors()
      await flushPromises()
      expect(requestedNames(mocks)).toEqual(['c.png'])

      resolvePreview('preview-url-c.png')
      await flushPromises()
      expect(requestedNames(mocks)).toEqual(['c.png', 'a.png'])
      wrapper.unmount()
    })

    it('loads the backward neighbor even if the forward one fails', async () => {
      const { wrapper, loader, mocks } = createWrapper({
        files: createFiles([{ name: 'a.png' }, { name: 'b.png' }, { name: 'c.png' }]),
        activeIndex: 1
      })
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      mocks.$previewService.loadPreview.mockRejectedValueOnce(new Error('failed'))

      loader.preloadNeighbors()
      await flushPromises()

      expect(requestedNames(mocks)).toEqual(['c.png', 'a.png'])
      consoleError.mockRestore()
      wrapper.unmount()
    })

    it('wraps around at both ends of the list', async () => {
      const files = createFiles([{ name: 'a.png' }, { name: 'b.png' }, { name: 'c.png' }])

      const first = createWrapper({ files, activeIndex: 0 })
      first.loader.preloadNeighbors()
      await flushPromises()
      expect(requestedNames(first.mocks)).toEqual(['b.png', 'c.png'])
      first.wrapper.unmount()

      const last = createWrapper({ files, activeIndex: 2 })
      last.loader.preloadNeighbors()
      await flushPromises()
      expect(requestedNames(last.mocks)).toEqual(['a.png', 'b.png'])
      last.wrapper.unmount()
    })

    it('requests a single neighbor for a two file list', async () => {
      const { wrapper, loader, mocks } = createWrapper({
        files: createFiles([{ name: 'a.png' }, { name: 'b.png' }]),
        activeIndex: 0
      })

      loader.preloadNeighbors()
      await flushPromises()

      expect(requestedNames(mocks)).toEqual(['b.png'])
      wrapper.unmount()
    })

    it('does not preload anything for a single file list', async () => {
      const { wrapper, loader, mocks } = createWrapper()

      loader.preloadNeighbors()
      await flushPromises()

      expect(mocks.$previewService.loadPreview).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('does not preload videos, audio, vault images or svg files', async () => {
      const { wrapper, loader, mocks, getUrlForResource } = createWrapper({
        files: createFiles([
          { name: 'a.png' },
          { name: 'clip.mp4', mimeType: 'video/mp4', isVideo: true, isImage: false },
          { name: 'song.mp3', mimeType: 'audio/mpeg', isAudio: true, isImage: false },
          { name: 'secret.png', resource: mock<Resource>({ isInVault: true }) },
          { name: 'logo.svg', mimeType: 'image/svg+xml' }
        ]),
        activeIndex: 0
      })

      loader.preloadNeighbors()
      await flushPromises()

      expect(requestedNames(mocks)).toEqual([])
      expect(getUrlForResource).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('does not preload the active file itself', async () => {
      const { wrapper, loader, mocks } = createWrapper({
        files: createFiles([{ name: 'a.png' }, { name: 'b.png' }]),
        activeIndex: 0
      })

      loader.preloadNeighbors()
      await flushPromises()

      expect(requestedNames(mocks)).not.toContain('a.png')
      wrapper.unmount()
    })

    it('does not refetch a neighbor that was preloaded already', async () => {
      const { wrapper, loader, mocks } = createWrapper({
        files: createFiles([{ name: 'a.png' }, { name: 'b.png' }]),
        activeIndex: 0
      })

      loader.preloadNeighbors()
      await flushPromises()
      expect(mocks.$previewService.loadPreview).toHaveBeenCalledTimes(1)

      loader.preloadNeighbors()
      await flushPromises()

      expect(mocks.$previewService.loadPreview).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })
  })

  describe('method "cancelStaleLoads"', () => {
    it('aborts loads outside the active position and its neighbors', async () => {
      const { wrapper, loader, mocks, mediaFiles, activeIndex } = createWrapper({
        files: createFiles([
          { name: 'a.png' },
          { name: 'b.png' },
          { name: 'c.png' },
          { name: 'd.png' }
        ]),
        activeIndex: 1
      })
      mocks.$previewService.loadPreview.mockImplementation(() => new Promise(() => undefined))

      unref(mediaFiles).forEach((file) => loader.loadPreviewImage(file))
      await flushPromises()

      activeIndex.value = 3
      loader.cancelStaleLoads()

      // a.png is d.png's backward neighbor thanks to the wrap, b.png is the only
      // request that is neither d.png nor one of its neighbors
      expect(signalsOf(mocks).map((signal) => signal.aborted)).toEqual([false, true, false, false])
      wrapper.unmount()
    })

    it('keeps loads for the active file and both neighbors', async () => {
      const { wrapper, loader, mocks, mediaFiles } = createWrapper({
        files: createFiles([{ name: 'a.png' }, { name: 'b.png' }, { name: 'c.png' }]),
        activeIndex: 1
      })
      mocks.$previewService.loadPreview.mockImplementation(() => new Promise(() => undefined))

      unref(mediaFiles).forEach((file) => loader.loadPreviewImage(file))
      await flushPromises()
      loader.cancelStaleLoads()

      expect(signalsOf(mocks).every((signal) => !signal.aborted)).toBe(true)
      wrapper.unmount()
    })

    it('settles and stops a warm-up download when its load becomes stale', async () => {
      MockImage.autoLoad = false
      const { wrapper, loader, mocks, mediaFiles } = createWrapper({
        files: createFiles([
          { name: 'a.png' },
          { name: 'b.png' },
          { name: 'c.png' },
          { name: 'd.png' }
        ]),
        activeIndex: 1
      })
      // public-link style: loadPreview resolves a remote url, the warm-up downloads
      mocks.$previewService.loadPreview.mockResolvedValue('https://example.org/d.jpg')

      // index 3 is no neighbor of the active index 1, its load is stale by definition
      const staleFile = unref(mediaFiles)[3]
      const load = loader.loadPreviewImage(staleFile)
      await flushPromises()
      expect(MockImage.instances).toHaveLength(1)

      loader.cancelStaleLoads()

      // the abort listener clears src synchronously: the download is stopped
      expect(MockImage.instances[0].src).toBe('')
      await load

      expect(staleFile.url).toBeUndefined()
      expect(staleFile.isLoading).toBe(true)
      // the abort must not be misread as a stale url: no second resolution
      expect(mocks.$previewService.loadPreview).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    it('does not start a warm-up when the url resolved after the load was aborted', async () => {
      const { wrapper, loader, mocks, mediaFiles } = createWrapper({
        files: createFiles([
          { name: 'a.png' },
          { name: 'b.png' },
          { name: 'c.png' },
          { name: 'd.png' }
        ]),
        activeIndex: 1
      })
      let resolvePreview: (url: string) => void
      mocks.$previewService.loadPreview.mockImplementationOnce(
        () => new Promise((resolve) => (resolvePreview = resolve))
      )

      const staleFile = unref(mediaFiles)[3]
      const load = loader.loadPreviewImage(staleFile)
      await flushPromises()

      // not every url resolver is signal-aware: a resolution may arrive after abort
      loader.cancelStaleLoads()
      resolvePreview('https://example.org/d.jpg')
      await load

      expect(MockImage.instances).toHaveLength(0)
      expect(staleFile.url).toBeUndefined()
      expect(staleFile.isLoading).toBe(true)
      wrapper.unmount()
    })
  })

  describe('unmount', () => {
    it('aborts all in-flight loads', async () => {
      const { wrapper, loader, mocks, mediaFiles } = createWrapper({
        files: createFiles([{ name: 'a.png' }, { name: 'b.png' }]),
        activeIndex: 0
      })
      mocks.$previewService.loadPreview.mockImplementation(() => new Promise(() => undefined))

      unref(mediaFiles).forEach((file) => loader.loadPreviewImage(file))
      await flushPromises()
      wrapper.unmount()

      expect(signalsOf(mocks).every((signal) => signal.aborted)).toBe(true)
    })

    it('does not start new requests afterwards', async () => {
      const { wrapper, loader, mocks, mediaFiles } = createWrapper({
        files: createFiles([{ name: 'a.png' }, { name: 'b.png' }]),
        activeIndex: 0
      })

      wrapper.unmount()
      mocks.$previewService.loadPreview.mockClear()
      await loader.loadPreviewImage(unref(mediaFiles)[1])

      expect(mocks.$previewService.loadPreview).not.toHaveBeenCalled()
    })

    it('settles a pending warm-up without resolving a new url', async () => {
      MockImage.autoLoad = false
      const { wrapper, loader, mocks, mediaFiles } = createWrapper({
        files: createFiles([{ name: 'a.png' }, { name: 'b.png' }]),
        activeIndex: 0
      })

      const load = loader.loadPreviewImage(unref(mediaFiles)[0])
      await flushPromises()
      expect(MockImage.instances).toHaveLength(1)

      wrapper.unmount()
      await load

      expect(mocks.$previewService.loadPreview).toHaveBeenCalledTimes(1)
      // unmount must stop the download too, not just settle the promise
      expect(MockImage.instances[0].src).toBe('')
    })
  })

  describe('browser cache warm-up', () => {
    it('does not create an image for blob urls, they carry the bytes already', async () => {
      const { wrapper, loader, mocks } = createWrapper()
      mocks.$previewService.loadPreview.mockResolvedValue('blob:preview-url')

      await loader.loadPreviewImage(createFile())

      expect(MockImage.instances).toHaveLength(0)
      wrapper.unmount()
    })

    it('warms the cache for remote urls', async () => {
      MockImage.autoLoad = false
      const { wrapper, loader, mocks } = createWrapper()
      mocks.$previewService.loadPreview.mockResolvedValue('https://example.org/preview.jpg')
      const mediaFile = createFile()

      const load = loader.loadPreviewImage(mediaFile)
      await flushPromises()

      expect(MockImage.instances.map((image) => image.src)).toEqual([
        'https://example.org/preview.jpg'
      ])

      MockImage.instances[0].triggerLoad()
      await load

      expect(mediaFile.url).toBe('https://example.org/preview.jpg')
      expect(mediaFile.isLoading).toBe(false)
      wrapper.unmount()
    })

    it('resolves a fresh url once when the warm-up hits a stale one', async () => {
      MockImage.autoLoad = false
      const { wrapper, loader, mocks } = createWrapper()
      mocks.$previewService.loadPreview
        .mockResolvedValueOnce('https://example.org/expired.jpg')
        .mockResolvedValueOnce('https://example.org/fresh.jpg')
      const mediaFile = createFile()

      const load = loader.loadPreviewImage(mediaFile)
      await flushPromises()

      MockImage.instances[0].triggerError()
      await flushPromises()

      expect(mocks.$previewService.loadPreview).toHaveBeenCalledTimes(2)
      expect(MockImage.instances.map((image) => image.src)).toEqual([
        'https://example.org/expired.jpg',
        'https://example.org/fresh.jpg'
      ])

      MockImage.instances[1].triggerLoad()
      await load

      expect(mediaFile.url).toBe('https://example.org/fresh.jpg')
      expect(mediaFile.isError).toBe(false)
      expect(mediaFile.isLoading).toBe(false)
      wrapper.unmount()
    })

    it('keeps the resolved url when the warm-up keeps failing', async () => {
      MockImage.autoLoad = false
      const { wrapper, loader, mocks } = createWrapper()
      mocks.$previewService.loadPreview
        .mockResolvedValueOnce('https://example.org/first.jpg')
        .mockResolvedValueOnce('https://example.org/second.jpg')
      const mediaFile = createFile()

      const load = loader.loadPreviewImage(mediaFile)
      await flushPromises()
      MockImage.instances[0].triggerError()
      await flushPromises()
      MockImage.instances[1].triggerError()
      await load

      // the warm-up is an optimization, the file still renders
      expect(mocks.$previewService.loadPreview).toHaveBeenCalledTimes(2)
      expect(mediaFile.url).toBe('https://example.org/second.jpg')
      expect(mediaFile.isError).toBe(false)
      expect(mediaFile.isLoading).toBe(false)
      wrapper.unmount()
    })
  })
})
