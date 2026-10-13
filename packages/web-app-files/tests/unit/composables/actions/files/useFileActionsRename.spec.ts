import { useFileActionsRename } from '../../../../../src/composables/actions/files'
import { useMessages, useModals, useResourcesStore } from '@opencloud-eu/web-pkg'
import { mock, mockDeep } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'

const currentFolder = {
  id: '1',
  path: '/folder'
}

describe('rename', () => {
  describe('computed property "actions"', () => {
    describe('isVisible property of returned element', () => {
      it.each([
        { resources: [{ canRename: () => true }] as Resource[], expectedStatus: true },
        { resources: [{ canRename: () => false }] as Resource[], expectedStatus: false },
        {
          resources: [{ canRename: () => true }, { canRename: () => true }] as Resource[],
          expectedStatus: false
        },
        {
          resources: [{ canRename: () => true, locked: true }] as Resource[],
          expectedStatus: false
        }
      ])('should be set correctly', (inputData) => {
        getWrapper({
          setup: ({ actions }, { space }) => {
            const resources = inputData.resources
            expect(unref(actions)[0].isVisible({ space, resources })).toBe(inputData.expectedStatus)
          }
        })
      })
    })
  })

  describe('rename action handler', () => {
    it('should trigger the rename modal window', () => {
      getWrapper({
        setup: async ({ actions }, { space }) => {
          const { dispatchModal } = useModals()
          const resources = [currentFolder]
          await unref(actions)[0].handler({ space, resources })
          expect(dispatchModal).toHaveBeenCalledTimes(1)
        }
      })
    })

    it.each([
      { name: 'folder', extension: '', isFolder: true, input: 'folder2', expected: '/folder2' },
      {
        name: 'dotted.folder',
        extension: 'folder',
        isFolder: true,
        input: 'dotted2.folder',
        expected: '/dotted2.folder'
      },
      { name: 'README', extension: '', isFolder: false, input: 'README2', expected: '/README2' },
      {
        name: 'file.txt',
        extension: 'txt',
        isFolder: false,
        input: 'file2',
        expected: '/file2.txt'
      }
    ])(
      'renames "$name" to "$expected" with hidden file extensions',
      async ({ name, extension, isFolder, input, expected }) => {
        let instance: ReturnType<typeof useFileActionsRename>
        const { mocks } = getWrapper({ setup: (i) => (instance = i) })
        const { space, $clientService: clientService } = mocks
        useResourcesStore().areFileExtensionsShown = false
        const resource = mock<Resource>({ name, extension, isFolder, path: `/${name}` })
        await unref(instance.actions)[0].handler({ space, resources: [resource] })

        const { dispatchModal } = useModals()
        const { inputValue, onConfirm } = vi.mocked(dispatchModal).mock.calls[0][0]
        expect(inputValue).toBe(isFolder ? name : name.replace(`.${extension}`, ''))
        await onConfirm(input)

        expect(clientService.webdav.moveFiles).toHaveBeenCalledWith(space, resource, space, {
          path: expected
        })
      }
    )
  })

  describe('method "renameResource"', () => {
    it('should call the rename action on a resource in the file list', () => {
      getWrapper({
        setup: async ({ renameResource }, { space }) => {
          const resource = { id: '2', path: '/folder', webDavPath: '/files/admin/folder' }
          await renameResource(space, resource, 'new name')

          const { upsertResource } = useResourcesStore()
          expect(upsertResource).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('should call the rename action on the current folder', () => {
      getWrapper({
        setup: async ({ renameResource }, { space }) => {
          await renameResource(space, currentFolder, 'new name')

          const { upsertResource } = useResourcesStore()
          expect(upsertResource).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('hands clear-text source and target path to moveFiles inside a vault', () => {
      getWrapper({
        setup: async ({ renameResource }, { space, clientService }) => {
          const resource = {
            id: '2',
            path: '/my.vault/report.txt',
            webDavPath: '/files/admin/my.vault/report.txt',
            storageId: 'space-1'
          }
          await renameResource(space, resource, 'renamed.txt')

          expect(clientService.webdav.moveFiles).toHaveBeenCalledWith(
            space,
            expect.objectContaining({ path: '/my.vault/report.txt' }),
            space,
            { path: '/my.vault/renamed.txt' }
          )
        }
      })
    })

    it('should handle errors properly', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      getWrapper({
        setup: async ({ renameResource }, { space, clientService }) => {
          clientService.webdav.moveFiles.mockRejectedValueOnce(new Error())

          await renameResource(space, currentFolder, 'new name')
          const { showErrorMessage } = useMessages()
          expect(showErrorMessage).toHaveBeenCalledTimes(1)
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (
    instance: ReturnType<typeof useFileActionsRename>,
    {
      space,
      clientService
    }: {
      space: SpaceResource
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  const mocks = {
    ...defaultComponentMocks(),
    space: mockDeep<SpaceResource>({
      webDavPath: 'irrelevant'
    })
  }

  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsRename()
        setup(instance, { space: mocks.space, clientService: mocks.$clientService })
      },
      {
        mocks,
        provide: mocks
      }
    )
  }
}
