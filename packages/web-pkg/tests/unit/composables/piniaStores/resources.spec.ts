import { createPinia, setActivePinia } from 'pinia'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import { useResourcesStore } from '../../../../src/composables/piniaStores/resources'
import { cacheService } from '../../../../src/services'

describe('useResourcesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    cacheService.filePreview.clear()
  })

  describe('preview releasing', () => {
    const file = mock<Resource>({ id: '1', name: 'file.png', type: 'file' })

    it('drops cached previews of removed resources', () => {
      const store = useResourcesStore()
      store.setResources([file])
      cacheService.filePreview.set('1', { src: 'blob:preview-1' }, 0)

      store.removeResources([file])

      expect(cacheService.filePreview.get('1')).toBeUndefined()
    })

    it('keeps cached previews when the resource list is cleared', () => {
      const store = useResourcesStore()
      store.setResources([file])
      cacheService.filePreview.set('1', { src: 'blob:preview-1' }, 0)

      store.clearResourceList()

      expect(cacheService.filePreview.get('1')).toEqual({ src: 'blob:preview-1' })
    })
  })
})
