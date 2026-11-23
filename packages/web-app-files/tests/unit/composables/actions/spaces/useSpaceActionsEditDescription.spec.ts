import { useSpaceActionsEditDescription } from '../../../../../src/composables/actions'
import { useMessages, useModals } from '@opencloud-eu/web-pkg'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'

describe('editDescription', () => {
  describe('handler', () => {
    it('should trigger the editDescription modal window with one resource', async () => {
      const { instance } = getWrapper()
      const { dispatchModal } = useModals()
      await unref(instance.actions)[0].handler({ resources: [{ id: '1' } as SpaceResource] })

      expect(dispatchModal).toHaveBeenCalledTimes(1)
    })
    it('should not trigger the editDescription modal window with no resource', async () => {
      const { instance } = getWrapper()
      const { dispatchModal } = useModals()
      await unref(instance.actions)[0].handler({ resources: [] })

      expect(dispatchModal).toHaveBeenCalledTimes(0)
    })
  })

  describe('method "editDescriptionSpace"', () => {
    it('should show message on success', async () => {
      const { instance, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
        mock<SpaceResource>()
      )
      await instance.editDescriptionSpace(mock<SpaceResource>(), 'doesntmatter')

      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
    })
    it('should only send the description, not the cached space name', async () => {
      const { instance, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
        mock<SpaceResource>()
      )
      await instance.editDescriptionSpace(mock<SpaceResource>({ id: '1', name: 'old' }), 'new')

      expect(mocks.$clientService.graphAuthenticated.drives.updateDrive).toHaveBeenCalledWith('1', {
        description: 'new'
      })
    })

    it('should show message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(new Error())
      await instance.editDescriptionSpace(mock<SpaceResource>(), 'doesntmatter')

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
    })
  })
})

function getWrapper() {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-projects' })
  })
  let instance: ReturnType<typeof useSpaceActionsEditDescription>
  const wrapper = getComposableWrapper(
    () => {
      instance = useSpaceActionsEditDescription()
    },
    {
      mocks,
      provide: mocks
    }
  )
  return { wrapper, instance, mocks }
}
