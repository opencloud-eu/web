import { mock } from 'vitest-mock-extended'
import { nextTick, ref, unref } from 'vue'
import {
  FolderResource,
  Resource,
  ShareSpaceResource,
  SpaceResource
} from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { useScrollToMock } from '../../../../mocks/useScrollToMock'
import {
  getVaultCreator,
  useMessages,
  useModals,
  useResourcesStore,
  useScrollTo
} from '@opencloud-eu/web-pkg'
import { useFileActionsCreateNewFolder } from '../../../../../src/composables/actions/files'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useScrollTo: vi.fn(),
  getVaultCreator: vi.fn(),
  markVaultStatus: vi.fn()
}))

const setupComponent = { name: 'VaultSetupStub' }
const vaultCreation = { folderExtension: 'vault', setupComponent }

describe('useFileActionsCreateNewFolder', () => {
  describe('addNewFolder', () => {
    it('create new folder', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        setup: async ({ addNewFolder }) => {
          await addNewFolder('myfolder')
          await nextTick()

          const { upsertResource } = useResourcesStore()
          expect(upsertResource).toHaveBeenCalled()

          const { showMessage } = useMessages()
          expect(showMessage).toHaveBeenCalledWith({ title: '»myfolder« was created successfully' })
        }
      })
    })

    it('show error message if createFolder fails', () => {
      const consoleErrorMock = vi.spyOn(console, 'error').mockReturnThis()
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        resolveCreateFolder: false,
        space,
        setup: async ({ addNewFolder }) => {
          await addNewFolder('myfolder')
          await nextTick()
          const { showErrorMessage } = useMessages()
          expect(showErrorMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              title: 'Failed to create folder'
            })
          )
          consoleErrorMock.mockRestore()
        }
      })
    })

    it('adds the remoteItemId if the current space is a share space', () => {
      const space = mock<ShareSpaceResource>({ id: '1', driveType: 'share' })
      getWrapper({
        space,
        setup: async ({ addNewFolder }) => {
          await addNewFolder('myfolder')

          const { upsertResource } = useResourcesStore()
          expect(upsertResource).toHaveBeenCalledWith(
            expect.objectContaining({ remoteItemId: '1' })
          )
        }
      })
    })

    it('creates an encrypted folder under the vault name and commits its secret', () => {
      const space = mock<SpaceResource>({ id: '1' })
      const finalizeVault = vi.fn()
      getWrapper({
        space,
        setup: async ({ addNewFolder }, mocks) => {
          await addNewFolder('myfolder', { encrypt: true, finalizeVault })
          await nextTick()

          expect(mocks.$clientService.webdav.createFolder).toHaveBeenCalledWith(space, {
            path: '/myfolder.vault'
          })
          // the scheme commits the secret once the folder exists
          expect(finalizeVault).toHaveBeenCalledWith(space, '/')
          // a new vault stays locked and the user stays put
          expect(mocks.$router.push).not.toHaveBeenCalled()

          const { showMessage } = useMessages()
          expect(showMessage).toHaveBeenCalledWith({
            title: '»myfolder.vault« was created successfully'
          })
        }
      })
    })

    it('names the vault with the marker of the registered scheme', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        vaultCreator: { creation: { folderExtension: 'crypt', setupComponent } },
        setup: async ({ addNewFolder }, mocks) => {
          await addNewFolder('myfolder', { encrypt: true, finalizeVault: vi.fn() })
          await nextTick()

          expect(mocks.$clientService.webdav.createFolder).toHaveBeenCalledWith(space, {
            path: '/myfolder.crypt'
          })
        }
      })
    })

    it('reports the name the file list shows when extensions are hidden', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        areFileExtensionsShown: false,
        setup: async ({ addNewFolder }, mocks) => {
          await addNewFolder('myfolder', { encrypt: true, finalizeVault: vi.fn() })
          await nextTick()

          expect(mocks.$clientService.webdav.createFolder).toHaveBeenCalledWith(space, {
            path: '/myfolder.vault'
          })
          const { showMessage } = useMessages()
          expect(showMessage).toHaveBeenCalledWith({
            title: '»myfolder« was created successfully'
          })
        }
      })
    })

    it('reports a folder that was created but whose secret could not be committed', () => {
      const consoleErrorMock = vi.spyOn(console, 'error').mockReturnThis()
      const space = mock<SpaceResource>({ id: '1' })
      const finalizeVault = vi.fn().mockRejectedValue(new Error('proppatch failed'))
      getWrapper({
        space,
        setup: async ({ addNewFolder }, mocks) => {
          await addNewFolder('myfolder', { encrypt: true, finalizeVault })
          await nextTick()

          // the folder exists, so it must not be reported as a failed creation
          expect(mocks.$clientService.webdav.createFolder).toHaveBeenCalled()
          const { showMessage, showErrorMessage } = useMessages()
          expect(showMessage).not.toHaveBeenCalled()
          expect(showErrorMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              title: '»myfolder.vault« was created, but its passphrase was not saved'
            })
          )
          consoleErrorMock.mockRestore()
        }
      })
    })

    it('does not navigate when creating a plain folder', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        setup: async ({ addNewFolder }, mocks) => {
          await addNewFolder('myfolder')
          await nextTick()

          expect(mocks.$router.push).not.toHaveBeenCalled()
        }
      })
    })

    it('fails instead of creating a plain folder when no vault scheme is registered', () => {
      const consoleErrorMock = vi.spyOn(console, 'error').mockReturnThis()
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        vaultCreator: null,
        space,
        setup: async ({ addNewFolder }, mocks) => {
          await addNewFolder('myfolder', { encrypt: true })

          expect(mocks.$clientService.webdav.createFolder).not.toHaveBeenCalled()
          const { showErrorMessage } = useMessages()
          expect(showErrorMessage).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Failed to create folder' })
          )
          consoleErrorMock.mockRestore()
        }
      })
    })
  })

  describe('createNewFolderModal', () => {
    it('should show modal', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        setup: ({ actions }) => {
          const { dispatchModal } = useModals()
          unref(actions)[0].handler()

          expect(dispatchModal).toHaveBeenCalledWith(
            expect.objectContaining({ customComponent: expect.anything() })
          )
        }
      })
    })

    it('passes the registered scheme’s creation bits to the modal', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        setup: ({ actions }) => {
          const { dispatchModal } = useModals()
          unref(actions)[0].handler()

          const { customComponentAttrs } = vi.mocked(dispatchModal).mock.calls[0][0]
          expect(customComponentAttrs().vaultCreation).toBe(vaultCreation)
        }
      })
    })

    it('offers no encryption inside a vault', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        currentFolder: mock<Resource>({ id: '1', path: '/my.vault', isInVault: true }),
        setup: ({ actions }) => {
          const { dispatchModal } = useModals()
          unref(actions)[0].handler()

          const { customComponentAttrs } = vi.mocked(dispatchModal).mock.calls[0][0]
          expect(customComponentAttrs().vaultCreation).toBeUndefined()
        }
      })
    })
  })
})

function getWrapper({
  resolveCreateFolder = true,
  space = undefined,
  // isInVault has to be set explicitly: every property of a bare mock is truthy
  currentFolder = mock<Resource>({ id: '1', path: '/', isInVault: false }),
  vaultCreator = { creation: vaultCreation },
  areFileExtensionsShown = true,
  setup
}: {
  resolveCreateFolder?: boolean
  space?: SpaceResource
  currentFolder?: Resource
  vaultCreator?: { creation?: { folderExtension: string; setupComponent: unknown } } | null
  areFileExtensionsShown?: boolean
  setup: (
    instance: ReturnType<typeof useFileActionsCreateNewFolder>,
    mocks: ReturnType<typeof defaultComponentMocks>
  ) => void
}) {
  vi.mocked(useScrollTo).mockImplementation(() => useScrollToMock())
  vi.mocked(getVaultCreator).mockReturnValue(vaultCreator as any)

  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    }),
    space
  }
  mocks.$clientService.webdav.createFolder.mockImplementation(() => {
    if (resolveCreateFolder) {
      return Promise.resolve({
        id: '1',
        type: 'folder',
        isReceivedShare: vi.fn(),
        path: '/'
      } as FolderResource)
    }
    return Promise.reject('error')
  })

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsCreateNewFolder({ space: ref(space) })
        setup(instance, mocks)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          piniaOptions: { resourcesStore: { currentFolder, areFileExtensionsShown } }
        }
      }
    )
  }
}
