import { mock, mockDeep } from 'vitest-mock-extended'
import { unref } from 'vue'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import {
  ProjectSpaceResource,
  Resource,
  SpaceResource,
  TrashResource
} from '@opencloud-eu/web-client'
import {
  SpaceActionOptions,
  useMessages,
  useModals,
  useResourcesStore,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { useFileActionsEmptyTrashBin } from '../../../../../src/composables/actions/files'

describe('emptyTrashBin', () => {
  describe('isVisible property', () => {
    it('should be false in a space trash bin with insufficient permissions', () => {
      getWrapper({
        driveType: 'project',
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [{ type: 'space', canDeleteFromTrashBin: () => false }] as SpaceResource[]
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
        setup: ({ actions }) => {
          const { dispatchModal } = useModals()
          unref(actions)[0].handler(mockDeep<SpaceActionOptions>())

          expect(dispatchModal).toHaveBeenCalledTimes(1)
          expect(dispatchModal).toHaveBeenCalledWith(
            expect.objectContaining({ showCancelAction: true })
          )
        }
      })
    })
  })

  describe('method "emptyTrashBin"', () => {
    it('should show message on success', async () => {
      const { instance, mocks } = getWrapper()
      await instance.emptyTrashBin({ space: mocks.space })

      const { showMessage } = useMessages()
      const { clearResources, resetSelection } = useResourcesStore()
      const { updateSpaceField } = useSpacesStore()

      expect(showMessage).toHaveBeenCalledTimes(1)

      expect(clearResources).not.toHaveBeenCalled()
      expect(resetSelection).toHaveBeenCalledTimes(1)

      expect(updateSpaceField).toHaveBeenCalledTimes(1)
    })

    it('should clear resources when trash resources are present in the file list', async () => {
      const { instance, mocks } = getWrapper({
        resources: [mock<TrashResource>({ ddate: 'date' })]
      })
      await instance.emptyTrashBin({ space: mocks.space })

      const { clearResources } = useResourcesStore()
      expect(clearResources).toHaveBeenCalledTimes(1)
    })

    it('should show message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const { instance, mocks } = getWrapper({ resolveClearTrashBin: false })
      await instance.emptyTrashBin({ space: mocks.space })

      const { showErrorMessage } = useMessages()
      const { clearResources, resetSelection } = useResourcesStore()
      const { updateSpaceField } = useSpacesStore()

      expect(showErrorMessage).toHaveBeenCalledTimes(1)

      expect(clearResources).not.toHaveBeenCalled()
      expect(resetSelection).not.toHaveBeenCalled()

      expect(updateSpaceField).not.toHaveBeenCalled()
    })
  })
})

function getWrapper({
  resolveClearTrashBin = true,
  driveType = 'personal',
  resources = [],
  setup
}: {
  resolveClearTrashBin?: boolean
  driveType?: string
  resources?: Resource[]
  setup?: (instance: ReturnType<typeof useFileActionsEmptyTrashBin>) => void
} = {}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({
        name: 'files-trash-generic'
      })
    }),
    space: mock<ProjectSpaceResource>({ driveType })
  }

  if (resolveClearTrashBin) {
    mocks.$clientService.webdav.clearTrashBin.mockResolvedValue(undefined)
  } else {
    mocks.$clientService.webdav.clearTrashBin.mockRejectedValue(new Error(''))
  }

  let instance: ReturnType<typeof useFileActionsEmptyTrashBin>
  const wrapper = getComposableWrapper(
    () => {
      instance = useFileActionsEmptyTrashBin()
      setup?.(instance)
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: { piniaOptions: { resourcesStore: { resources } } }
    }
  )
  return { wrapper, instance, mocks }
}
