import { createPinia, setActivePinia } from 'pinia'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { useResourcesStore } from '../../../../src/composables/piniaStores/resources'
import { buildFilePreviewCacheKey, cacheService } from '../../../../src/services'

describe('useResourcesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    cacheService.filePreview.clear()
  })

  describe('loadAncestorMetaData', () => {
    const space = mock<SpaceResource>({ id: 'storage$space' })

    const getClient = () =>
      mock<WebDAV>({
        getFileInfo: vi.fn().mockImplementation((_space, { path }) =>
          Promise.resolve(
            mock<Resource>({
              fileId: `id-of-${path}`,
              parentFolderId: 'parent',
              shareTypes: []
            })
          )
        )
      })

    it('stats every ancestor of the folder', async () => {
      const store = useResourcesStore()
      const client = getClient()

      await store.loadAncestorMetaData({
        folder: mock<Resource>({ path: '/a/b/c', fileId: 'id-of-/a/b/c' }),
        space,
        client
      })

      const statted = vi.mocked(client.getFileInfo).mock.calls.map(([, ref]) => ref.path)
      // the root is filled in from the space, not statted
      expect(statted).toEqual(['/a/b', '/a'])
      expect(store.ancestorMetaData['/a/b'].id).toBe('id-of-/a/b')
      expect(store.ancestorMetaData['/a/b/c'].id).toBe('id-of-/a/b/c')
    })

    it('reuses what it already knows about the same space', async () => {
      const store = useResourcesStore()
      await store.loadAncestorMetaData({
        folder: mock<Resource>({ path: '/a/b', fileId: 'id-of-/a/b' }),
        space,
        client: getClient()
      })

      const client = getClient()
      await store.loadAncestorMetaData({
        folder: mock<Resource>({ path: '/a/b/c', fileId: 'id-of-/a/b/c' }),
        space,
        client
      })

      const statted = vi.mocked(client.getFileInfo).mock.calls.map(([, ref]) => ref.path)
      expect(statted).toEqual([])
    })
  })

  describe('preview releasing', () => {
    const file = mock<Resource>({ id: '1', name: 'file.png', type: 'file' })

    it('drops cached previews of removed resources, for all dimensions', () => {
      const store = useResourcesStore()
      store.setResources([file])
      cacheService.filePreview.set(
        buildFilePreviewCacheKey('1', [36, 36]),
        { src: 'blob:thumbnail-1' },
        0
      )
      cacheService.filePreview.set(
        buildFilePreviewCacheKey('1', [1200, 1200]),
        { src: 'blob:preview-1' },
        0
      )

      store.removeResources([file])

      expect(cacheService.filePreview.keys()).toEqual([])
    })

    it('keeps cached previews when the resource list is cleared', () => {
      const store = useResourcesStore()
      store.setResources([file])
      cacheService.filePreview.set(buildFilePreviewCacheKey('1'), { src: 'blob:preview-1' }, 0)

      store.clearResourceList()

      expect(cacheService.filePreview.get(buildFilePreviewCacheKey('1'))).toEqual({
        src: 'blob:preview-1'
      })
    })
  })
})
