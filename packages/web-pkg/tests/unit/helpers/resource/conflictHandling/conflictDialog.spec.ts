import { mock, mockDeep } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import { ConflictDialog, ResolveConflict } from '../../../../../src/helpers/resource'
import { useModals } from '../../../../../src/composables/piniaStores'
import { setActivePinia } from 'pinia'
import { createMockStore } from '@opencloud-eu/web-test-helpers'

const getConflictDialogInstance = () => {
  return new ConflictDialog(vi.fn(), vi.fn())
}

describe('conflict dialog', () => {
  describe('method "resolveAllConflicts"', () => {
    it('should return the resolved conflicts including the resource(s) and the strategy', async () => {
      const conflictDialog = getConflictDialogInstance()
      const strategy = mockDeep<ResolveConflict>()
      conflictDialog.resolveFileExists = vi.fn().mockImplementation(() => ({
        strategy,
        doForAllConflicts: false
      }))
      const resource = mock<Resource>({ name: 'someFile.txt' })
      const targetFolder = mock<Resource>({ path: '/' })
      const targetFolderResources = [mock<Resource>({ path: '/someFile.txt' })]
      const resolvedConflicts = await conflictDialog.resolveAllConflicts(
        [resource],
        targetFolder,
        targetFolderResources
      )

      expect(resolvedConflicts.length).toBe(1)
      expect(resolvedConflicts[0].resource).toEqual(resource)
      expect(resolvedConflicts[0].strategy).toEqual(strategy)
    })
    it('should pass the type of the existing resource', async () => {
      const conflictDialog = getConflictDialogInstance()
      conflictDialog.resolveFileExists = vi
        .fn()
        .mockResolvedValue({ strategy: null, doForAllConflicts: false })
      const resource = mock<Resource>({ name: 'dup', isFolder: false })
      const targetFolder = mock<Resource>({ path: '/' })
      const targetFolderResources = [mock<Resource>({ path: '/dup', isFolder: true })]
      await conflictDialog.resolveAllConflicts([resource], targetFolder, targetFolderResources)

      expect(conflictDialog.resolveFileExists).toHaveBeenCalledWith(resource, 1, false, false, true)
    })
  })
  describe('method "resolveFileExists"', () => {
    it('should create the modal in the end', () => {
      setActivePinia(createMockStore())
      const { dispatchModal } = useModals()
      const conflictDialog = getConflictDialogInstance()
      conflictDialog.resolveFileExists(mock<Resource>(), 2, true)
      expect(dispatchModal).toHaveBeenCalledTimes(1)
    })
    it('should name the type of the existing resource in the title', () => {
      setActivePinia(createMockStore())
      const { dispatchModal } = useModals()
      const conflictDialog = new ConflictDialog((s: string) => s, vi.fn())
      conflictDialog.resolveFileExists(mock<Resource>({ isFolder: false }), 1, false, false, true)
      expect(dispatchModal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Folder already exists' })
      )
    })
  })
})
