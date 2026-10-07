import App from '../../src/App.vue'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, VueWrapper } from '@vue/test-utils'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { FileContext, queryItemAsString } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'

vi.mock('@panzoom/panzoom')

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  queryItemAsString: vi.fn(),
  createFileRouteOptions: vi.fn(() => ({ params: {}, query: {} }))
}))

const activeFiles = [
  {
    id: '1',
    fileId: '1',
    name: 'bear.png',
    mimeType: 'image/png',
    path: 'personal/admin/bear.png',
    hidden: false,
    canDownload: () => true
  },
  {
    id: '2',
    fileId: '2',
    name: 'elephant.png',
    mimeType: 'image/png',
    path: 'personal/admin/elephant.png',
    hidden: false,
    canDownload: () => true
  },
  {
    id: '3',
    fileId: '3',
    name: 'wale_sounds.flac',
    mimeType: 'audio/flac',
    path: 'personal/admin/wale_sounds.flac',
    hidden: true,
    canDownload: () => true
  },
  {
    id: '4',
    fileId: '4',
    name: 'lonely_sloth_very_sad.gif',
    mimeType: 'image/gif',
    path: 'personal/admin/lonely_sloth_very_sad.gif',
    hidden: false,
    canDownload: () => true
  },
  {
    id: '5',
    fileId: '5',
    name: 'tiger_eats_plants.mp4',
    mimeType: 'video/mp4',
    path: 'personal/admin/tiger_eats_plants.mp4',
    hidden: true,
    canDownload: () => true
  },
  {
    id: '6',
    fileId: '6',
    name: 'happy_hippo.gif',
    mimeType: 'image/gif',
    path: 'personal/admin/happy_hippo.gif',
    hidden: false,
    canDownload: () => true
  },
  {
    id: '7',
    fileId: '7',
    name: 'sleeping_dog.gif',
    mimeType: 'image/gif',
    path: 'personal/admin/sleeping_dog.gif',
    hidden: false,
    canDownload: () => true
  },
  {
    id: '8',
    fileId: '8',
    name: 'cat_murr_murr.gif',
    mimeType: 'image/gif',
    path: 'personal/admin/cat_murr_murr.gif',
    hidden: false,
    canDownload: () => true
  },
  {
    id: '9',
    fileId: '9',
    name: 'labrador.gif',
    mimeType: 'image/gif',
    path: 'personal/admin/labrador.gif',
    hidden: false,
    canDownload: () => true
  }
]

// visible files: bear.png, elephant.png, lonely_sloth_very_sad.gif, happy_hippo.gif,
// sleeping_dog.gif, cat_murr_murr.gif, labrador.gif
const wrappers: VueWrapper[] = []

describe('Preview app', () => {
  beforeEach(() => {
    vi.mocked(queryItemAsString).mockReturnValue('1')
  })

  afterEach(() => {
    while (wrappers.length) {
      wrappers.pop().unmount()
    }
  })

  describe('Preloading', () => {
    // files are sorted by name: bear.png, cat_murr_murr.gif, elephant.png, happy_hippo.gif,
    // labrador.gif, lonely_sloth_very_sad.gif, sleeping_dog.gif
    it('loads the active file and then its forward and backward neighbors', async () => {
      const { mocks } = createShallowMountWrapper()
      await flushPromises()

      expect(requestedNames(mocks)).toEqual(['bear.png', 'cat_murr_murr.gif', 'sleeping_dog.gif'])
    })

    it('does not load a preloaded file again when navigating to it', async () => {
      const { wrapper, mocks } = createShallowMountWrapper()
      await flushPromises()

      ;(wrapper.vm as any).goToNext()
      await flushPromises()

      // cat_murr_murr.gif was preloaded, only its new forward neighbor is left to load
      expect(requestedNames(mocks)).toEqual([
        'bear.png',
        'cat_murr_murr.gif',
        'sleeping_dog.gif',
        'elephant.png'
      ])
    })

    it('does not load anything again while walking back and forth', async () => {
      const { wrapper, mocks } = createShallowMountWrapper()
      await flushPromises()

      ;(wrapper.vm as any).goToNext()
      await flushPromises()
      ;(wrapper.vm as any).goToPrev()
      await flushPromises()

      // bear.png is back in the focus and so are its preloaded neighbors
      expect(requestedNames(mocks)).toEqual([
        'bear.png',
        'cat_murr_murr.gif',
        'sleeping_dog.gif',
        'elephant.png'
      ])
    })
  })

  describe('Method "reloadMediaFileUrl"', () => {
    it('fetches a fresh url without the cached download url and swaps it in', async () => {
      const { wrapper, getUrlForResource, revokeUrl } = createShallowMountWrapper()
      await nextTick()
      getUrlForResource.mockClear()
      revokeUrl.mockClear()
      getUrlForResource.mockResolvedValue('new-url')

      const resource = { downloadURL: 'expired-url' } as Resource
      const mediaFile = { url: 'old-url', resource }
      await (wrapper.vm as any).reloadMediaFileUrl(mediaFile)

      expect(getUrlForResource).toHaveBeenCalledWith(
        // no matching space in the test store
        undefined,
        expect.objectContaining({ downloadURL: undefined }),
        expect.objectContaining({ signal: expect.anything() })
      )
      // the store resource must stay untouched
      expect(resource.downloadURL).toBe('expired-url')
      expect(revokeUrl).toHaveBeenCalledWith('old-url')
      expect(mediaFile.url).toBe('new-url')
    })

    it('aborts a previous reload and discards its late url', async () => {
      const { wrapper, getUrlForResource, revokeUrl } = createShallowMountWrapper()
      await nextTick()
      getUrlForResource.mockClear()
      revokeUrl.mockClear()

      let resolveFirst: (url: string) => void
      getUrlForResource
        .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
        .mockResolvedValueOnce('second-url')

      const mediaFile = { url: 'old-url', resource: {} as Resource }
      const firstReload = (wrapper.vm as any).reloadMediaFileUrl(mediaFile)
      await (wrapper.vm as any).reloadMediaFileUrl(mediaFile)
      resolveFirst('first-url')
      await firstReload

      expect(getUrlForResource.mock.calls[0][2].signal.aborted).toBe(true)
      expect(revokeUrl).toHaveBeenCalledWith('first-url')
      expect(mediaFile.url).toBe('second-url')
    })

    it('discards the url when the app unmounts while the reload is in flight', async () => {
      const { wrapper, getUrlForResource, revokeUrl } = createShallowMountWrapper()
      await nextTick()
      getUrlForResource.mockClear()
      revokeUrl.mockClear()

      let resolveUrl: (url: string) => void
      getUrlForResource.mockImplementationOnce(
        () => new Promise((resolve) => (resolveUrl = resolve))
      )

      const mediaFile = { url: 'old-url', resource: {} as Resource }
      const reload = (wrapper.vm as any).reloadMediaFileUrl(mediaFile)
      wrapper.unmount()
      resolveUrl('late-url')
      await reload

      expect(revokeUrl).toHaveBeenCalledWith('late-url')
      expect(mediaFile.url).toBe('old-url')
    })

    it('keeps the current url when the request fails', async () => {
      const { wrapper, getUrlForResource, revokeUrl } = createShallowMountWrapper()
      await nextTick()
      getUrlForResource.mockClear()
      revokeUrl.mockClear()
      getUrlForResource.mockRejectedValue(new Error('failed'))
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const mediaFile = { url: 'old-url', resource: {} as Resource }
      await (wrapper.vm as any).reloadMediaFileUrl(mediaFile)

      expect(mediaFile.url).toBe('old-url')
      expect(revokeUrl).not.toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })

  describe('Swipe', () => {
    const swipe = async (element: Element, fromX: number, toX: number) => {
      const touchAt = (x: number) => ({ clientX: x, clientY: 300 }) as Touch
      element.dispatchEvent(
        new TouchEvent('touchstart', { bubbles: true, touches: [touchAt(fromX)] })
      )
      element.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [touchAt(toX)] }))
      element.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [] }))
      await nextTick()
    }
    const getStage = async ({ isZoomed = false } = {}) => {
      const MediaImage = defineComponent({
        setup(_, { expose }) {
          expose({ isZoomed: () => isZoomed })
          return () => h('div')
        }
      })
      const { wrapper } = createShallowMountWrapper({ stubs: { MediaImage } })
      await wrapper.setProps({ isFolderLoading: false })
      await flushPromises()
      return { wrapper, stage: wrapper.find('.stage_media').element }
    }

    it('goes to the next file on a swipe to the left and back on a swipe to the right', async () => {
      const { wrapper, stage } = await getStage()
      await swipe(stage, 300, 100)
      expect((wrapper.vm as any).activeIndex).toBe(1)
      await swipe(stage, 100, 300)
      expect((wrapper.vm as any).activeIndex).toBe(0)
    })

    it('ignores swipes on a zoomed image, it is panned instead', async () => {
      const { wrapper, stage } = await getStage({ isZoomed: true })
      await swipe(stage, 300, 100)
      expect((wrapper.vm as any).activeIndex).toBe(0)
    })

    it('ignores swipes shorter than the threshold', async () => {
      const { wrapper, stage } = await getStage()
      await swipe(stage, 300, 270)
      expect((wrapper.vm as any).activeIndex).toBe(0)
    })

    it.each(['<audio></audio>', '<video controls></video>'])(
      'ignores swipes that start on the native media controls of %s',
      async (html) => {
        const { wrapper, stage } = await getStage()
        stage.insertAdjacentHTML('beforeend', html)
        await swipe(stage.lastElementChild, 300, 100)
        expect((wrapper.vm as any).activeIndex).toBe(0)
      }
    )
  })

  describe('Generated "mediaFiles"', () => {
    it('should hide hidden shares if the share visibility query is not set to "hidden"', () => {
      const { wrapper } = createShallowMountWrapper()
      expect((wrapper.vm as any).mediaFiles.length).toStrictEqual(7)
    })

    it('should hide visible shares if the share visibility query is set to "hidden"', async () => {
      const { wrapper } = createShallowMountWrapper({
        currentFileContext: { routeQuery: ref({ ['q_share-visibility']: 'hidden' }) }
      })
      await nextTick()
      expect((wrapper.vm as any).mediaFiles.length).toStrictEqual(2)
    })
  })
})

const requestedNames = (mocks: ReturnType<typeof defaultComponentMocks>) =>
  mocks.$previewService.loadPreview.mock.calls.map(([{ resource }]) => resource.name)

function createShallowMountWrapper({
  currentFileContext,
  stubs = {}
}: {
  currentFileContext?: Partial<FileContext>
  stubs?: Record<string, unknown>
} = {}) {
  const mocks = defaultComponentMocks()
  // blob urls mirror what the preview service returns for private spaces and keep the
  // browser cache warm-up out of the way, it has its own tests
  mocks.$previewService.loadPreview.mockImplementation(({ resource }) =>
    Promise.resolve(`blob:preview-${resource.name}`)
  )

  const getUrlForResource = vi.fn()
  const revokeUrl = vi.fn()

  const wrapper = shallowMount(App, {
    props: {
      currentFileContext: mock<FileContext>({
        path: 'personal/admin/bear.png',
        ...currentFileContext
      }),
      activeFiles,
      isFolderLoading: true,
      revokeUrl,
      getUrlForResource,
      loadFolderForFileContext: vi.fn()
    },
    global: {
      plugins: [...defaultPlugins()],
      mocks,
      provide: mocks,
      stubs
    }
  })
  wrappers.push(wrapper)

  return {
    wrapper,
    mocks,
    getUrlForResource,
    revokeUrl
  }
}
