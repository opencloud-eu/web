import { createPinia, setActivePinia } from 'pinia'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import { useResourcesStore } from '../../../../src/composables/piniaStores/resources'
import { buildFilePreviewCacheKey, cacheService } from '../../../../src/services'

describe('useResourcesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    cacheService.filePreview.clear()
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
