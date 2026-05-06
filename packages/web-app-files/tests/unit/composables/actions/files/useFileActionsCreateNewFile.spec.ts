import { mock } from 'vitest-mock-extended'
import { ref, unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { RouteLocation } from '@opencloud-eu/web-test-helpers'
import { ApplicationFileExtension } from '@opencloud-eu/web-pkg'
import { useFileActionsCreateNewFile } from '../../../../../src/composables/actions/files'
import {
  FileActionOptions,
  useFileActions,
  useModals,
  useResourcesStore
} from '@opencloud-eu/web-pkg'

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
          openFile(mock<Resource>(), null)

          const { upsertResource } = useResourcesStore()
          expect(upsertResource).toHaveBeenCalled()
        }
      })
    })
  })

  describe('createNewFileModal', () => {
    it('should show modal', () => {
      const space = mock<SpaceResource>({ id: '1' })
      getWrapper({
        space,
        setup: async ({ actions }) => {
          const { dispatchModal } = useModals()
          const fileActionOptions: FileActionOptions = { space, resources: [] } as FileActionOptions
          await unref(actions)[0].handler(fileActionOptions)

          expect(dispatchModal).toHaveBeenCalled()
        }
      })
    })
  })
})

function getWrapper({
  resolveCreateFile = true,
  space = undefined,
  setup
}: {
  resolveCreateFile?: boolean
  space?: SpaceResource
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

  const currentFolder = mock<Resource>({ id: '1', path: '/' })

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsCreateNewFile({ space: ref(space) })
        setup(instance)
      },
      {
        provide: mocks,
        mocks,
        pluginOptions: {
          piniaOptions: {
            appsState: {
              fileExtensions: [
                mock<ApplicationFileExtension>({
                  app: 'text-editor',
                  extension: '.txt',
                  newFileMenu: { menuTitle: vi.fn() }
                })
              ]
            },
            resourcesStore: { currentFolder }
          }
        }
      }
    )
  }
}
