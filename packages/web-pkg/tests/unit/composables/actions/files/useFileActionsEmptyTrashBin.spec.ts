import {
  SpaceActionOptions,
  useFileActionsEmptyTrashBin
} from '../../../../../src/composables/actions'
import {
  useMessages,
  useModals,
  useResourcesStore,
  useSpacesStore
} from '../../../../../src/composables/piniaStores'
import { mock, mockDeep } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'
import {
  ProjectSpaceResource,
  Resource,
  SpaceResource,
  TrashResource
} from '@opencloud-eu/web-client'

describe('emptyTrashBin', () => {
  describe('isVisible property', () => {
    it('should be false when location is invalid', () => {
      getWrapper({
        invalidLocation: true,
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be false in a space trash bin with insufficient permissions', () => {
      getWrapper({
        driveType: 'project',
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [{ canDeleteFromTrashBin: () => false }] as SpaceResource[]
            })
          ).toBe(false)
        }
      })
    })
  })
  describe('isDisabled property', () => {
    it('should be false if space property "hasTrashedItems" is true ', () => {
      getWrapper({
        driveType: 'project',
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isDisabled({
              resources: [{ hasTrashedItems: true }] as SpaceResource[]
            })
          ).toBe(false)
        }
      })
    })
    it('should be true if space property "hasTrashedItems" is false ', () => {
      getWrapper({
        driveType: 'project',
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isDisabled({
              resources: [{ hasTrashedItems: false }] as SpaceResource[]
            })
          ).toBe(true)
        }
      })
    })
  })

  describe('empty trash bin action', () => {
    it('should trigger the empty trash bin modal window', () => {
      getWrapper({
        setup: async ({ actions }) => {
          const { dispatchModal } = useModals()
          await unref(actions)[0].handler(mockDeep<SpaceActionOptions>())

          expect(dispatchModal).toHaveBeenCalledTimes(1)
        }
      })
    })
  })

  describe('method "emptyTrashBin"', () => {
    it('should show message on success', () => {
      getWrapper({
        setup: async ({ emptyTrashBin }, { space }) => {
          await emptyTrashBin({ space })

          const { showMessage } = useMessages()
          const { clearResources, resetSelection } = useResourcesStore()
          const { updateSpaceField } = useSpacesStore()

          expect(showMessage).toHaveBeenCalledTimes(1)

          expect(clearResources).not.toHaveBeenCalled()
          expect(resetSelection).toHaveBeenCalledTimes(1)

          expect(updateSpaceField).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('should clear resources when trash resources are present in the file list', () => {
      getWrapper({
        resources: [mock<TrashResource>({ ddate: 'date' })],
        setup: async ({ emptyTrashBin }, { space }) => {
          await emptyTrashBin({ space })

          const { clearResources } = useResourcesStore()
          expect(clearResources).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('should show message on error', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      getWrapper({
        resolveClearTrashBin: false,
        setup: async ({ emptyTrashBin }, { space }) => {
          await emptyTrashBin({ space })

          const { showErrorMessage } = useMessages()
          const { clearResources, resetSelection } = useResourcesStore()
          const { updateSpaceField } = useSpacesStore()

          expect(showErrorMessage).toHaveBeenCalledTimes(1)

          expect(clearResources).not.toHaveBeenCalled()
          expect(resetSelection).not.toHaveBeenCalled()

          expect(updateSpaceField).not.toHaveBeenCalled()
        }
      })
    })
  })
})

function getWrapper({
  invalidLocation = false,
  resolveClearTrashBin = true,
  driveType = 'personal',
  resources = [],
  setup
}: {
  invalidLocation?: boolean
  resolveClearTrashBin?: boolean
  driveType?: string
  resources?: Resource[]
  setup: (
    instance: ReturnType<typeof useFileActionsEmptyTrashBin>,
    {
      space
    }: {
      space: ProjectSpaceResource
    }
  ) => void
}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({
        name: invalidLocation ? 'files-spaces-generic' : 'files-trash-generic'
      })
    }),
    space: mock<ProjectSpaceResource>({ driveType })
  }

  if (resolveClearTrashBin) {
    mocks.$clientService.webdav.clearTrashBin.mockResolvedValue(undefined)
  } else {
    mocks.$clientService.webdav.clearTrashBin.mockRejectedValue(new Error(''))
  }

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsEmptyTrashBin()
        setup(instance, { space: mocks.space })
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { resourcesStore: { resources } } }
      }
    )
  }
}
