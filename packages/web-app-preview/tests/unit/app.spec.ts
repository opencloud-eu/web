import App from '../../src/App.vue'
import { nextTick, ref } from 'vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { FileContext, queryItemAsString } from '@opencloud-eu/web-pkg'
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

  return {
    wrapper: shallowMount(App, {
      props: {
        currentFileContext: mock<FileContext>({
          path: 'personal/admin/bear.png',
          ...currentFileContext
        }),
        activeFiles,
        isFolderLoading: true,
        revokeUrl: vi.fn(),
        getUrlForResource: vi.fn(),
        loadFolderForFileContext: vi.fn()
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    }),
    mocks
  }
}
