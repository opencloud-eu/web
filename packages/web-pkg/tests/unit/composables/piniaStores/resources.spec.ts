import { createPinia, setActivePinia } from 'pinia'
import { mock } from 'vitest-mock-extended'
import { computed, unref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { useResourcesStore } from '../../../../src/composables/piniaStores/resources'
import { buildFilePreviewCacheKey, cacheService, eventBus } from '../../../../src/services'

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

  describe('updateResourceField', () => {
    it('updates the current folder reactively if the id matches', () => {
      const store = useResourcesStore()
      store.setCurrentFolder({ id: '1', starred: false } as Resource)
      const isStarred = computed(() => store.currentFolder.starred)
      expect(unref(isStarred)).toBe(false)

      store.updateResourceField({ id: '1', field: 'starred', value: true })

      expect(unref(isStarred)).toBe(true)
    })

    it('does not update the current folder if the id does not match', () => {
      const store = useResourcesStore()
      store.setCurrentFolder({ id: '1', starred: false } as Resource)
      store.setResources([{ id: '2', starred: false } as Resource])

      store.updateResourceField({ id: '2', field: 'starred', value: true })

      expect(store.currentFolder.starred).toBe(false)
      expect(store.resources[0].starred).toBe(true)
    })

    it('updates both the current folder and a resource with the same id', () => {
      const store = useResourcesStore()
      store.setCurrentFolder({ id: '1', starred: false } as Resource)
      store.setResources([{ id: '1', starred: false } as Resource])

      store.updateResourceField({ id: '1', field: 'starred', value: true })

      expect(store.currentFolder.starred).toBe(true)
      expect(store.resources[0].starred).toBe(true)
    })

    it('does not update a current folder without id', () => {
      const store = useResourcesStore()
      store.setCurrentFolder({ starred: false } as Resource)

      store.updateResourceField({ id: undefined, field: 'starred', value: true })

      expect(store.currentFolder.starred).toBe(false)
    })
  })

  describe('deselectResources', () => {
    it('removes the resources from the selection and resets the latest selected resource', () => {
      const store = useResourcesStore()
      const publishSpy = vi.spyOn(eventBus, 'publish')
      store.setSelection(['1', '2', '3'])
      store.setLastSelectedId('2')

      store.deselectResources(['2', '3'])

      expect(store.selectedIds).toEqual(['1'])
      expect(store.latestSelectedId).toBeNull()
      expect(publishSpy).toHaveBeenCalledWith('app.files.shiftAnchor.reset')
    })
  })

  describe('hiding hidden files', () => {
    const visibleFile = mock<Resource>({ id: '1', name: 'file.txt', type: 'file' })
    const hiddenFile = mock<Resource>({ id: '2', name: '.hidden', type: 'file' })
    const hiddenFolder = mock<Resource>({ id: '3', name: '.config', type: 'folder' })

    function setupStore() {
      const store = useResourcesStore()
      store.setAreHiddenFilesShown(true)
      store.setResources([visibleFile, hiddenFile, hiddenFolder])
      store.setSelection(['1', '2', '3'])
      return store
    }

    it('removes no longer shown resources from the selection', () => {
      const store = setupStore()

      store.setAreHiddenFilesShown(false)

      expect(store.selectedIds).toEqual(['1'])
      expect(store.selectedResources).toEqual([visibleFile])
    })

    it('resets the shift selection anchor', () => {
      const store = setupStore()
      const publishSpy = vi.spyOn(eventBus, 'publish')

      store.setAreHiddenFilesShown(false)

      expect(publishSpy).toHaveBeenCalledWith('app.files.shiftAnchor.reset')
    })

    it('resets the latest selected resource if it is no longer shown', () => {
      const store = setupStore()
      store.setLastSelectedId('2')

      store.setAreHiddenFilesShown(false)

      expect(store.latestSelectedId).toBeNull()
    })

    it('keeps the latest selected resource if it is still shown', () => {
      const store = setupStore()
      store.setLastSelectedId('1')

      store.setAreHiddenFilesShown(false)

      expect(store.latestSelectedId).toBe('1')
    })
  })
})
