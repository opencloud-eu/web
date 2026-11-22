import { unref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { useMessages, useModals } from '@opencloud-eu/web-pkg'
import { useSpaceActionsDeleteImage } from '../../../../../src/composables/actions/spaces'

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
    it('should trigger the modal', async () => {
      const { instance } = getWrapper()
      const { dispatchModal } = useModals()
      await unref(instance.actions)[0].handler({ resources: [mock<SpaceResource>({ id: '1' })] })
      expect(dispatchModal).toHaveBeenCalledTimes(1)
    })
  })
  describe('method "deleteSpaceImage"', () => {
    it('should show message on success', async () => {
      const { instance, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
        mock<SpaceResource>()
      )
      await instance.deleteSpaceImage({ space: mock<SpaceResource>() })

      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
    })

    it('should show message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(new Error())
      await instance.deleteSpaceImage({ space: mock<SpaceResource>() })

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
    })
  })
})

function getWrapper({
  setup
}: {
  setup?: (instance: ReturnType<typeof useSpaceActionsDeleteImage>) => void
} = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
  })

  let instance: ReturnType<typeof useSpaceActionsDeleteImage>
  const wrapper = getComposableWrapper(
    () => {
      instance = useSpaceActionsDeleteImage()
      setup?.(instance)
    },
    {
      mocks,
      provide: mocks
    }
  )
  return { wrapper, instance, mocks }
}
