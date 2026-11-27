import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Resource, ShareSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { RouteLocation } from '@opencloud-eu/web-test-helpers'
import { ApplicationFileExtension } from '@opencloud-eu/web-pkg'
import { useFileActionsCreateNewFile } from '../../../../../src/composables/actions/files'
import { useFileActions, useModals, useResourcesStore } from '@opencloud-eu/web-pkg'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: vi.fn(() => mock<ReturnType<typeof useFileActions>>())
}))

describe('useFileActionsCreateNewFile', () => {
  describe('openFile', () => {
    it('upserts the resource before opening', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        setup: ({ openFile }) => {
          openFile(space, mock<Resource>(), null)

          const { upsertResource } = useResourcesStore()
          expect(upsertResource).toHaveBeenCalled()
        }
      })
    })
  })

  describe('creating a file', () => {
    it('adds the remoteItemId if the current space is a share space', async () => {
      const space = mock<ShareSpaceResource>({ id: '1', driveType: 'share' })
      let instance: ReturnType<typeof useFileActionsCreateNewFile>
      getWrapper({
        space,
        fileExtensions: [
          mock<ApplicationFileExtension>({
            app: 'text-editor',
            extension: '.txt',
            createFileHandler: undefined,
            newFileMenu: { menuTitle: vi.fn() }
          })
        ],
        setup: (i) => (instance = i)
      })

      await unref(instance.actions)[0].handler({ space, resources: [] })
      const { dispatchModal } = useModals()
      await vi.mocked(dispatchModal).mock.calls[0][0].onConfirm('new.txt')

      expect(useResourcesStore().upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({ remoteItemId: '1' })
      )
    })
  })

  describe('handler', () => {
    it('does not open the create modal while no current folder is set', async () => {
      const space = mock<SpaceResource>({ id: '1' })
      let instance: ReturnType<typeof useFileActionsCreateNewFile>
      getWrapper({ space, currentFolder: null, setup: (i) => (instance = i) })

      await unref(instance.actions)[0].handler({ space, resources: [] })

      expect(useModals().dispatchModal).not.toHaveBeenCalled()
    })

    it('creates the file in the folder the modal was opened in', async () => {
      const space = mock<SpaceResource>({ id: '1' })
      let instance: ReturnType<typeof useFileActionsCreateNewFile>
      const { mocks } = getWrapper({
        space,
        currentFolder: mock<Resource>({ id: '1', path: '/old' }),
        fileExtensions: [
          mock<ApplicationFileExtension>({
            app: 'text-editor',
            extension: 'txt',
            createFileHandler: undefined,
            newFileMenu: { menuTitle: vi.fn() }
          })
        ],
        setup: (i) => (instance = i)
      })

      await unref(instance.actions)[0].handler({ space, resources: [] })
      useResourcesStore().currentFolder = mock<Resource>({ id: '2', path: '/new' })
      const { dispatchModal } = useModals()
      await vi.mocked(dispatchModal).mock.calls[0][0].onConfirm('new.txt')

      expect(mocks.$clientService.webdav.putFileContents).toHaveBeenCalledWith(space, {
        path: '/old/new.txt'
      })
    })
  })

  describe('isVisible', () => {
    it.each([
      { driveType: 'public', permissions: 'CKZ', visible: false },
      { driveType: 'public', permissions: 'DNVCKZ', visible: true },
      { driveType: 'share', permissions: 'SCK', visible: false },
      { driveType: 'share', permissions: 'SDNVCK', visible: true }
    ])(
      'visible: $visible in a $driveType space with folder permissions "$permissions"',
      ({ driveType, permissions, visible }) => {
        const space = mock<SpaceResource>({ id: '1', driveType })
        getWrapper({
          space,
          currentFolder: mock<Resource>({ id: '1', path: '/', permissions, canUpload: () => true }),
          setup: ({ actions }) => {
            expect(unref(actions)[0].isVisible({ space })).toBe(visible)
          }
        })
      }
    )
  })

  describe('quickCreateActions', () => {
    it('only contains actions of file extensions with quickCreate enabled', () => {
      getWrapper({
        fileExtensions: [
          mock<ApplicationFileExtension>({
            app: 'text-editor',
            extension: 'ocnote',
            newFileMenu: { menuTitle: vi.fn(), quickCreate: true }
          }),
          mock<ApplicationFileExtension>({
            app: 'text-editor',
            extension: 'txt',
            newFileMenu: { menuTitle: vi.fn(), quickCreate: false }
          })
        ],
        setup: ({ actions, quickCreateActions }) => {
          expect(unref(actions).map(({ ext }) => ext)).toEqual(['ocnote', 'txt'])
          expect(unref(quickCreateActions).map(({ ext }) => ext)).toEqual(['ocnote'])
          expect(unref(quickCreateActions)[0]).toBe(unref(actions)[0])
        }
      })
    })
  })

  describe('isDisabled / disabledTooltip', () => {
    it('disables external editor app actions inside a vault', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        currentFolder: mock<Resource>({ id: '1', path: '/', isInVault: true }),
        fileExtensions: [
          mock<ApplicationFileExtension>({
            app: 'external-collabora',
            extension: '.odt',
            newFileMenu: { menuTitle: vi.fn() }
          })
        ],
        setup: ({ actions }) => {
          const action = unref(actions)[0]
          expect(action.isDisabled()).toBe(true)
        }
      })
    })

    it('does not disable external editor app actions outside of a vault', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        currentFolder: mock<Resource>({ id: '1', path: '/', isInVault: false }),
        fileExtensions: [
          mock<ApplicationFileExtension>({
            app: 'external-collabora',
            extension: '.odt',
            newFileMenu: { menuTitle: vi.fn() }
          })
        ],
        setup: ({ actions }) => {
          const action = unref(actions)[0]
          expect(action.isDisabled()).toBe(false)
          expect(action.disabledTooltip()).toBeUndefined()
        }
      })
    })

    it('does not disable non-external app actions inside a vault', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        currentFolder: mock<Resource>({ id: '1', path: '/', isInVault: true }),
        fileExtensions: [
          mock<ApplicationFileExtension>({
            app: 'text-editor',
            extension: '.txt',
            newFileMenu: { menuTitle: vi.fn() }
          })
        ],
        setup: ({ actions }) => {
          const action = unref(actions)[0]
          expect(action.isDisabled()).toBe(false)
          expect(action.disabledTooltip()).toBeUndefined()
        }
      })
    })
  })
})

function getWrapper({
  resolveCreateFile = true,
  space = undefined,
  currentFolder = mock<Resource>({ id: '1', path: '/' }),
  fileExtensions = [
    mock<ApplicationFileExtension>({
      app: 'text-editor',
      extension: '.txt',
      newFileMenu: { menuTitle: vi.fn() }
    })
  ],
  setup
}: {
  resolveCreateFile?: boolean
  space?: SpaceResource
  currentFolder?: Resource
  fileExtensions?: ApplicationFileExtension[]
  setup: (instance: ReturnType<typeof useFileActionsCreateNewFile>) => void
}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    }),
    space
  }
  mocks.$clientService.webdav.putFileContents.mockImplementation(() => {
    if (resolveCreateFile) {
      return Promise.resolve({
        id: '1',
        type: 'folder',
        path: '/',
        isReceivedShare: vi.fn()
      } as Resource)
    }
    return Promise.reject('error')
  })

  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsCreateNewFile()
        setup(instance)
      },
      {
        provide: mocks,
        mocks,
        pluginOptions: {
          piniaOptions: {
            appsState: {
              fileExtensions
            },
            resourcesStore: { currentFolder }
          }
        }
      }
    )
  }
}
