import App from '../../src/App.vue'
import { nextTick, ref } from 'vue'
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

describe('Preview app', () => {
  describe('Method "loadPreviewImage"', () => {
    it('should load the preview image if active file changes', async () => {
      const { wrapper, mocks } = createShallowMountWrapper()
      await nextTick()
      ;(wrapper.vm as any).goToNext()
      await nextTick()

      expect(mocks.$previewService.loadPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: expect.objectContaining({
            name: 'cat_murr_murr.gif'
          })
        }),
        expect.anything(),
        expect.anything(),
        expect.anything()
      )
    })

    it('uses the preview service for a non-vault image even when the server reports no thumbnail', async () => {
      const { wrapper, mocks, getUrlForResource } = createShallowMountWrapper()
      await nextTick()
      // ignore the implicit load for the active file on mount
      mocks.$previewService.loadPreview.mockClear()
      getUrlForResource.mockClear()

      const mediaFile = {
        isImage: true,
        mimeType: 'image/png',
        resource: mock<Resource>({ isInVault: false, hasPreview: () => false })
      }
      await (wrapper.vm as any).loadPreviewImage(mediaFile)

      // must NOT download the full original just because there's no thumbnail
      expect(mocks.$previewService.loadPreview).toHaveBeenCalled()
      expect(getUrlForResource).not.toHaveBeenCalled()
    })

    it('fetches the full (decrypted) image via getUrlForResource for a vault image', async () => {
      const { wrapper, mocks, getUrlForResource } = createShallowMountWrapper()
      await nextTick()
      mocks.$previewService.loadPreview.mockClear()
      getUrlForResource.mockClear()

      const mediaFile = {
        isImage: true,
        mimeType: 'image/png',
        resource: mock<Resource>({ isInVault: true, hasPreview: () => false })
      }
      await (wrapper.vm as any).loadPreviewImage(mediaFile)

      expect(getUrlForResource).toHaveBeenCalled()
      expect(mocks.$previewService.loadPreview).not.toHaveBeenCalled()
    })

    it('fetches SVG files via getUrlForResource instead of the preview service', async () => {
      const { wrapper, mocks, getUrlForResource } = createShallowMountWrapper()
      await nextTick()
      mocks.$previewService.loadPreview.mockClear()
      getUrlForResource.mockClear()

      const mediaFile = {
        isImage: true,
        mimeType: 'image/svg+xml',
        resource: mock<Resource>({ isInVault: false, hasPreview: () => true })
      }
      await (wrapper.vm as any).loadPreviewImage(mediaFile)

      expect(getUrlForResource).toHaveBeenCalled()
      expect(mocks.$previewService.loadPreview).not.toHaveBeenCalled()
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

function createShallowMountWrapper({
  currentFileContext
}: {
  currentFileContext?: Partial<FileContext>
} = {}) {
  const mocks = defaultComponentMocks()
  mocks.$previewService.loadPreview.mockResolvedValue('')
  vi.mocked(queryItemAsString).mockImplementationOnce(() => '1')

  const getUrlForResource = vi.fn()
  const revokeUrl = vi.fn()

  return {
    wrapper: shallowMount(App, {
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
        provide: mocks
      }
    }),
    mocks,
    getUrlForResource,
    revokeUrl
  }
}
