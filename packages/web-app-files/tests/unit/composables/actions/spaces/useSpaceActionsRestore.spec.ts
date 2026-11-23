import { useSpaceActionsRestore } from '../../../../../src/composables/actions/spaces'
import { SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { useMessages, useModals } from '@opencloud-eu/web-pkg'

describe('restore', () => {
  describe('isVisible property', () => {
    it('should be false when no resource given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be false when the space can not be restored', () => {
      const spaceMock = mock<SpaceResource>({
        driveType: 'project',
        canRestore: () => false
      })
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [spaceMock] })).toBe(false)
        }
      })
    })
    it('should be true when the space can be restored', () => {
      const spaceMock = mock<SpaceResource>({
        driveType: 'project',
        canRestore: () => true
      })

      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [spaceMock] })).toBe(true)
        }
      })
    })
  })

  describe('handler', () => {
    it('should trigger the restore modal window', async () => {
      const { instance } = getWrapper()
      const { dispatchModal } = useModals()
      await unref(instance.actions)[0].handler({
        resources: [mock<SpaceResource>({ id: '1', canRestore: () => true, driveType: 'project' })]
      })

      expect(dispatchModal).toHaveBeenCalledTimes(1)
    })
    it('should not trigger the restore modal window without any resource', async () => {
      const { instance } = getWrapper()
      const { dispatchModal } = useModals()
      await unref(instance.actions)[0].handler({
        resources: [mock<SpaceResource>({ id: '1', canRestore: () => false })]
      })

      expect(dispatchModal).toHaveBeenCalledTimes(0)
    })
  })

  describe('method "restoreSpace"', () => {
    it('should show message on success', async () => {
      const { instance, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
        mock<SpaceResource>()
      )
      await instance.restoreSpaces([mock<SpaceResource>({ id: '1', canRestore: () => true })])

      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
    })

    it('should show message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(new Error())
      await instance.restoreSpaces([mock<SpaceResource>({ id: '1', canRestore: () => true })])

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
    })
  })
})

function getWrapper({
  setup
}: {
  setup?: (instance: ReturnType<typeof useSpaceActionsRestore>) => void
} = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-projects' })
  })
  let instance: ReturnType<typeof useSpaceActionsRestore>
  const wrapper = getComposableWrapper(
    () => {
      instance = useSpaceActionsRestore()
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
