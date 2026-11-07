import { mock, mockDeep } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import {
  ConflictDialog,
  ResolveConflict,
  ResolveStrategy
} from '../../../../../src/helpers/resource'
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

      expect(conflictDialog.resolveFileExists).toHaveBeenCalledWith(
        resource,
        1,
        false,
        false,
        true,
        false,
        false
      )
    })
    describe('closing a dialog', () => {
      const targetFolder = mock<Resource>({ path: '/target' })
      const cancel = { strategy: ResolveStrategy.CANCEL, doForAllConflicts: false }
      const resources = [
        { id: '1', name: 'a.txt', path: '/fa/a.txt', isFolder: false },
        { id: '2', name: 'a.txt', path: '/fb/a.txt', isFolder: false },
        { id: '3', name: 'b.txt', path: '/fc/b.txt', isFolder: false }
      ] as Resource[]
      const targetFolderResources = [
        mock<Resource>({ path: '/target/a.txt', isFolder: false }),
        mock<Resource>({ path: '/target/b.txt', isFolder: false })
      ]

      it('stops asking and ends with the cancelled conflict when the first dialog is closed', async () => {
        const conflictDialog = getConflictDialogInstance()
        conflictDialog.resolveFileExists = vi.fn().mockResolvedValue(cancel)

        const resolvedConflicts = await conflictDialog.resolveAllConflicts(
          resources,
          targetFolder,
          targetFolderResources
        )

        expect(conflictDialog.resolveFileExists).toHaveBeenCalledTimes(1)
        expect(resolvedConflicts.map(({ resource, strategy }) => [resource, strategy])).toEqual([
          [resources[0], ResolveStrategy.CANCEL]
        ])
      })
      it('stops asking when a later dialog is closed', async () => {
        const conflictDialog = getConflictDialogInstance()
        conflictDialog.resolveFileExists = vi
          .fn()
          .mockResolvedValueOnce({ strategy: ResolveStrategy.REPLACE, doForAllConflicts: false })
          .mockResolvedValueOnce(cancel)

        const resolvedConflicts = await conflictDialog.resolveAllConflicts(
          resources,
          targetFolder,
          targetFolderResources
        )

        expect(conflictDialog.resolveFileExists).toHaveBeenCalledTimes(2)
        expect(resolvedConflicts.map(({ strategy }) => strategy)).toEqual([
          ResolveStrategy.REPLACE,
          ResolveStrategy.CANCEL
        ])
      })
    })
    describe('items of the same batch with the same name', () => {
      const targetFolder = mock<Resource>({ path: '/target' })
      const file = (id: string, dir: string, name = 'report.txt') =>
        ({ id, name, path: `/${dir}/${name}`, isFolder: false }) as Resource
      const folder = (id: string, dir: string, name = 'docs') =>
        ({ id, name, path: `/${dir}/${name}`, isFolder: true }) as Resource

      it('treats a later item with the name of an earlier one as a conflict', async () => {
        const conflictDialog = getConflictDialogInstance()
        conflictDialog.resolveFileExists = vi
          .fn()
          .mockResolvedValue({ strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false })
        const resources = [file('1', 'fa'), file('2', 'fb')]

        const resolvedConflicts = await conflictDialog.resolveAllConflicts(
          resources,
          targetFolder,
          []
        )

        expect(resolvedConflicts).toEqual([
          {
            resource: resources[1],
            existingResource: resources[0],
            strategy: ResolveStrategy.KEEP_BOTH
          }
        ])
        // replacing is not offered because it would overwrite the other item of the batch
        expect(conflictDialog.resolveFileExists).toHaveBeenCalledExactlyOnceWith(
          resources[1],
          1,
          false,
          false,
          false,
          false,
          true
        )
      })
      it('passes the type of the earlier item of the batch', async () => {
        const conflictDialog = getConflictDialogInstance()
        conflictDialog.resolveFileExists = vi
          .fn()
          .mockResolvedValue({ strategy: ResolveStrategy.SKIP, doForAllConflicts: false })
        const resources = [folder('1', 'fa', 'x'), file('2', 'fb', 'x')]

        await conflictDialog.resolveAllConflicts(resources, targetFolder, [])

        expect(conflictDialog.resolveFileExists).toHaveBeenCalledExactlyOnceWith(
          resources[1],
          1,
          false,
          false,
          true,
          false,
          true
        )
      })
      it('counts the remaining conflicts including the clashes inside the batch', async () => {
        const conflictDialog = getConflictDialogInstance()
        conflictDialog.resolveFileExists = vi
          .fn()
          .mockResolvedValue({ strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false })
        const resources = [
          file('1', 'fa'),
          file('2', 'fb'),
          file('3', 'fc'),
          file('4', 'fd', 'a.txt')
        ]
        const targetFolderResources = [mock<Resource>({ path: '/target/a.txt', isFolder: false })]

        await conflictDialog.resolveAllConflicts(resources, targetFolder, targetFolderResources)

        expect(
          vi
            .mocked(conflictDialog.resolveFileExists)
            .mock.calls.map(([resource, count]) => [resource, count])
        ).toEqual([
          [resources[1], 3],
          [resources[2], 2],
          [resources[3], 1]
        ])
      })
      it('offers replacing an existing item when the earlier item of the batch did not take its name', async () => {
        const conflictDialog = getConflictDialogInstance()
        conflictDialog.resolveFileExists = vi
          .fn()
          .mockResolvedValue({ strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false })
        const existing = mock<Resource>({ path: '/target/report.txt', isFolder: false })
        const resources = [file('1', 'fa'), file('2', 'fb')]

        const resolvedConflicts = await conflictDialog.resolveAllConflicts(
          resources,
          targetFolder,
          [existing]
        )

        expect(resolvedConflicts.map(({ existingResource }) => existingResource)).toEqual([
          existing,
          existing
        ])
        expect(
          vi.mocked(conflictDialog.resolveFileExists).mock.calls.map((args) => args[6])
        ).toEqual([false, false])
      })
      it('does not offer replacing when an earlier item of the batch replaces the existing item', async () => {
        const conflictDialog = getConflictDialogInstance()
        conflictDialog.resolveFileExists = vi
          .fn()
          .mockResolvedValueOnce({ strategy: ResolveStrategy.REPLACE, doForAllConflicts: false })
          .mockResolvedValueOnce({ strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false })
        const existing = mock<Resource>({ path: '/target/report.txt', isFolder: false })
        const resources = [file('1', 'fa'), file('2', 'fb')]

        const resolvedConflicts = await conflictDialog.resolveAllConflicts(
          resources,
          targetFolder,
          [existing]
        )

        expect(resolvedConflicts[1].existingResource).toBe(resources[0])
        expect(
          vi.mocked(conflictDialog.resolveFileExists).mock.calls.map((args) => args[6])
        ).toEqual([false, true])
      })
      it.each([ResolveStrategy.KEEP_BOTH, ResolveStrategy.SKIP])(
        'applies strategy %s to all following conflicts without asking again',
        async (strategy) => {
          const conflictDialog = getConflictDialogInstance()
          conflictDialog.resolveFileExists = vi
            .fn()
            .mockResolvedValue({ strategy, doForAllConflicts: true })
          const resources = [file('1', 'fa'), file('2', 'fb'), file('3', 'fc')]

          const resolvedConflicts = await conflictDialog.resolveAllConflicts(
            resources,
            targetFolder,
            []
          )

          expect(conflictDialog.resolveFileExists).toHaveBeenCalledTimes(1)
          expect(resolvedConflicts.map((c) => [c.resource, c.strategy])).toEqual([
            [resources[1], strategy],
            [resources[2], strategy]
          ])
        }
      )
      it('asks again without replacing when "replace" for all meets a clash inside the batch', async () => {
        const conflictDialog = getConflictDialogInstance()
        conflictDialog.resolveFileExists = vi
          .fn()
          .mockResolvedValueOnce({ strategy: ResolveStrategy.REPLACE, doForAllConflicts: true })
          .mockResolvedValueOnce({ strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false })
        const resources = [file('1', 'fa'), file('2', 'fb'), file('3', 'fc', 'a.txt')]
        const targetFolderResources = [
          mock<Resource>({ path: '/target/report.txt', isFolder: false }),
          mock<Resource>({ path: '/target/a.txt', isFolder: false })
        ]

        const resolvedConflicts = await conflictDialog.resolveAllConflicts(
          resources,
          targetFolder,
          targetFolderResources
        )

        expect(conflictDialog.resolveFileExists).toHaveBeenCalledTimes(2)
        expect(conflictDialog.resolveFileExists).toHaveBeenLastCalledWith(
          resources[1],
          2,
          false,
          false,
          false,
          false,
          true
        )
        expect(resolvedConflicts.map(({ strategy }) => strategy)).toEqual([
          ResolveStrategy.REPLACE,
          ResolveStrategy.KEEP_BOTH,
          ResolveStrategy.REPLACE
        ])
      })
      it('does not offer replacing an existing item that is another item of the batch', async () => {
        const conflictDialog = getConflictDialogInstance()
        conflictDialog.resolveFileExists = vi
          .fn()
          .mockResolvedValue({ strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: false })
        const resources = [file('1', 'fa'), file('2', 'target')]
        // the listing returns the same resource as a separate object
        const targetFolderResources = [{ ...resources[1] }]

        const resolvedConflicts = await conflictDialog.resolveAllConflicts(
          resources,
          targetFolder,
          targetFolderResources
        )

        expect(resolvedConflicts.map(({ existingResource }) => existingResource)).toEqual([
          targetFolderResources[0],
          targetFolderResources[0]
        ])
        // replacing the item in the target folder by itself is fine
        expect(
          vi.mocked(conflictDialog.resolveFileExists).mock.calls.map((args) => args[6])
        ).toEqual([true, false])
      })
      it('does not report a conflict for items with different names', async () => {
        const conflictDialog = getConflictDialogInstance()
        conflictDialog.resolveFileExists = vi.fn()
        const resources = [file('1', 'fa', 'a.txt'), file('2', 'fb', 'b.txt'), folder('3', 'fc')]

        const resolvedConflicts = await conflictDialog.resolveAllConflicts(
          resources,
          targetFolder,
          []
        )

        expect(resolvedConflicts).toEqual([])
        expect(conflictDialog.resolveFileExists).not.toHaveBeenCalled()
      })
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
    it('shows the close button and a cancel button to cancel the whole operation', () => {
      setActivePinia(createMockStore())
      const { dispatchModal } = useModals()
      const conflictDialog = getConflictDialogInstance()
      conflictDialog.resolveFileExists(mock<Resource>(), 1)
      const [options] = vi.mocked(dispatchModal).mock.calls[0]
      expect(options.showCancelAction).toBe(true)
      expect(options.hideCancelButton).toBeFalsy()
    })
    it.each([true, false])('hides the replace action if "hideReplace" is %s', (hideReplace) => {
      setActivePinia(createMockStore())
      const { dispatchModal } = useModals()
      const conflictDialog = getConflictDialogInstance()
      conflictDialog.resolveFileExists(mock<Resource>(), 1, false, false, false, false, hideReplace)
      const { customComponentAttrs } = vi.mocked(dispatchModal).mock.calls[0][0]
      expect(customComponentAttrs()).toEqual(
        expect.objectContaining({ hideSecondaryAction: hideReplace })
      )
    })
  })
})
