import { useSpaceActionsDeleteImage } from '../../../../../src/composables/actions/spaces/useSpaceActionsDeleteImage'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { useMessages, useModals } from '../../../../../src/composables/piniaStores'

describe('delete image', () => {
  describe('isVisible property', () => {
    it('should be false when no resource given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be false when multiple resources are given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [mock<SpaceResource>(), mock<SpaceResource>()]
            })
          ).toBe(false)
        }
      })
    })
    it('should be false when permission is not granted', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [mock<SpaceResource>({ canEditImage: () => false })]
            })
          ).toBe(false)
        }
      })
    })
    it('should be false when no image data is set', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [mock<SpaceResource>({ spaceImageData: null })]
            })
          ).toBe(false)
        }
      })
    })
    it('should be true when permission is granted', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [mock<SpaceResource>({ canEditImage: () => true })]
            })
          ).toBe(true)
        }
      })
    })
  })
  describe('method "handler"', () => {
    it('should trigger the modal', () => {
      getWrapper({
        setup: async ({ actions }) => {
          const { dispatchModal } = useModals()
          await unref(actions)[0].handler({ resources: [mock<SpaceResource>({ id: '1' })] })
          expect(dispatchModal).toHaveBeenCalledTimes(1)
        }
      })
    })
  })
  describe('method "deleteSpaceImage"', () => {
    it('should show message on success', () => {
      getWrapper({
        setup: async ({ deleteSpaceImage }, { clientService }) => {
          clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
            mock<SpaceResource>()
          )
          await deleteSpaceImage({ space: mock<SpaceResource>() })

          const { showMessage } = useMessages()
          expect(showMessage).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('should show message on error', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      getWrapper({
        setup: async ({ deleteSpaceImage }, { clientService }) => {
          clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(new Error())
          await deleteSpaceImage({ space: mock<SpaceResource>() })

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
    instance: ReturnType<typeof useSpaceActionsDeleteImage>,
    {
      clientService
    }: {
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
  })

  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsDeleteImage()
        setup(instance, { clientService: mocks.$clientService })
      },
      {
        mocks,
        provide: mocks
      }
    )
  }
}
