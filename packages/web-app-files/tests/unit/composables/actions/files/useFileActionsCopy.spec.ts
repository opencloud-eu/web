import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  getComposableWrapper,
  useGetMatchingSpaceMock
} from '@opencloud-eu/web-test-helpers'
import { useFileActionsCopy } from '../../../../../src/composables/actions/files'
import {
  ResourceTransfer,
  useGetMatchingSpace,
  useModals,
  usePasteWorker
} from '@opencloud-eu/web-pkg'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  usePasteWorker: vi.fn(),
  useGetMatchingSpace: vi.fn(),
  ResourceTransfer: vi.fn()
}))

type StartWorker = ReturnType<typeof usePasteWorker>['startWorker']

describe('copy', () => {
  describe('computed property "actions"', () => {
    describe('handler', () => {
      it('copies the current folder which is not part of the folder listing', async () => {
        const currentFolder = {
          ...mock<Resource>(),
          id: 'cf-1',
          storageId: 'space-1',
          path: '/source'
        } as Resource
        const otherResource = { ...mock<Resource>(), id: 'other', path: '/other' } as Resource
        const targetFolder = { ...mock<Resource>(), id: 'target', path: '/target' } as Resource
        const startWorker = vi.fn()

        vi.mocked(ResourceTransfer).mockImplementation(
          class {
            getTransferData = vi.fn().mockResolvedValue([{}])
            showResultMessage = vi.fn()
          } as unknown as typeof ResourceTransfer
        )

        let callbackFn: (resources: Resource[]) => Promise<void>
        const { space } = getWrapper({
          currentFolder,
          resources: [otherResource],
          selectedIds: [otherResource.id],
          startWorker,
          setup: ({ actions }) => {
            const { dispatchModal } = useModals()
            unref(actions)[0].handler({ space: mock<SpaceResource>(), resources: [currentFolder] })
            callbackFn = vi.mocked(dispatchModal).mock.calls[0][0].customComponentAttrs()
              .callbackFn as typeof callbackFn
          }
        })

        await callbackFn([targetFolder])

        expect(ResourceTransfer).toHaveBeenCalledWith(
          space,
          [currentFolder],
          space,
          targetFolder,
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
        expect(startWorker).toHaveBeenCalled()
      })
    })

    describe('isVisible', () => {
      it('returns true if "canDownload" is true', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: null,
                resources: [mock<Resource>({ id: '1', canDownload: () => true, isInVault: false })]
              })
            ).toBeTruthy()
          }
        })
      })
      it('returns false if "canDownload" is false', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: null,
                resources: [mock<Resource>({ id: '1', canDownload: () => false, isInVault: false })]
              })
            ).toBeFalsy()
          }
        })
      })
      it('returns false for trashed resources', () => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = {
              ...mock<Resource>({ id: '1', canDownload: () => true, isInVault: false }),
              ddate: '2026-01-01'
            } as Resource
            expect(unref(actions)[0].isVisible({ space: null, resources: [resource] })).toBeFalsy()
          }
        })
      })
      it('returns false for share list entries', () => {
        getWrapper({
          currentFolder: null,
          setup: ({ actions }) => {
            const resource = {
              ...mock<Resource>({ id: '1', canDownload: () => true, isInVault: false }),
              sharedWith: []
            } as Resource
            expect(unref(actions)[0].isVisible({ space: null, resources: [resource] })).toBeFalsy()
          }
        })
      })
      it('returns true for a share root browsed inside its space', () => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = {
              ...mock<Resource>({ id: '1', canDownload: () => true, isInVault: false }),
              sharedWith: []
            } as Resource
            expect(unref(actions)[0].isVisible({ space: null, resources: [resource] })).toBeTruthy()
          }
        })
      })
      it('returns false when resources contain a project space', () => {
        getWrapper({
          setup: ({ actions }) => {
            const projectSpace = {
              ...mock<Resource>({ id: '1', canDownload: () => true }),
              type: 'space',
              driveType: 'project'
            } as Resource
            expect(
              unref(actions)[0].isVisible({
                space: null,
                resources: [projectSpace]
              })
            ).toBeFalsy()
          }
        })
      })
    })
  })
})

function getWrapper({
  currentFolder = mock<Resource>({ id: 'cf-1', path: '/source' }),
  resources = [],
  selectedIds = [],
  startWorker = vi.fn(),
  setup
}: {
  currentFolder?: Resource
  resources?: Resource[]
  selectedIds?: string[]
  startWorker?: StartWorker
  setup: (instance: ReturnType<typeof useFileActionsCopy>) => void
}) {
  const space = mock<SpaceResource>({ id: 'space-1' })
  vi.mocked(useGetMatchingSpace).mockImplementation(() =>
    useGetMatchingSpaceMock({ getMatchingSpace: () => space })
  )
  vi.mocked(usePasteWorker).mockReturnValue({ startWorker })

  const mocks = {
    ...defaultComponentMocks()
  }
  return {
    mocks,
    space,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsCopy()
        setup(instance)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          piniaOptions: { resourcesStore: { currentFolder, resources, selectedIds } }
        }
      }
    )
  }
}
