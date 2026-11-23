import { useSpaceActionsDelete } from '../../../../../src/composables/actions'
import { useMessages, useModals } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { User } from '@opencloud-eu/web-client/graph/generated'

describe('delete', () => {
  describe('isVisible property', () => {
    it('should be false when no resource given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be false when the space can not be deleted', () => {
      const spaceMock = mock<SpaceResource>({ driveType: 'project', canBeDeleted: () => false })
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [spaceMock] })).toBe(false)
        }
      })
    })
    it('should be true when the space can be deleted', () => {
      const spaceMock = mock<SpaceResource>({ driveType: 'project', canBeDeleted: () => true })
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [spaceMock] })).toBe(true)
        }
      })
    })
  })

  describe('handler', () => {
    it('should trigger the delete modal window', async () => {
      const { instance } = getWrapper()
      const { dispatchModal } = useModals()
      await unref(instance.actions)[0].handler({
        resources: [
          mock<SpaceResource>({ id: '1', canBeDeleted: () => true, driveType: 'project' })
        ]
      })

      expect(dispatchModal).toHaveBeenCalledTimes(1)
    })
    it('should not trigger the delete modal window without any resource to delete', async () => {
      const { instance } = getWrapper()
      const { dispatchModal } = useModals()
      await unref(instance.actions)[0].handler({
        resources: [
          mock<SpaceResource>({ id: '1', canBeDeleted: () => false, driveType: 'project' })
        ]
      })

      expect(dispatchModal).toHaveBeenCalledTimes(0)
    })
  })

  describe('method "deleteSpace"', () => {
    it('should show message on success', async () => {
      const { instance, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.deleteDrive.mockResolvedValue()

      await instance.deleteSpaces([
        mock<SpaceResource>({ id: '1', canBeDeleted: () => true, driveType: 'project' })
      ])

      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
    })

    it('should show message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.deleteDrive.mockRejectedValue(new Error())
      await instance.deleteSpaces([
        mock<SpaceResource>({ id: '1', canBeDeleted: () => true, driveType: 'project' })
      ])

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
    })
  })
})

function getWrapper({
  setup
}: {
  setup?: (instance: ReturnType<typeof useSpaceActionsDelete>) => void
} = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-projects' })
  })
  let instance: ReturnType<typeof useSpaceActionsDelete>
  const wrapper = getComposableWrapper(
    () => {
      instance = useSpaceActionsDelete()
      setup?.(instance)
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          userState: { user: { id: '1', onPremisesSamAccountName: 'alice' } as User }
        }
      }
    }
  )
  return { wrapper, instance, mocks }
}
