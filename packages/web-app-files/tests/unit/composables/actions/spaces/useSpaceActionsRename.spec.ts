import { useSpaceActionsRename } from '../../../../../src/composables/actions/spaces'
import { useMessages, useModals } from '@opencloud-eu/web-pkg'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'

describe('rename', () => {
  describe('handler', () => {
    it('should trigger the rename modal window', async () => {
      const { instance } = getWrapper()
      const { dispatchModal } = useModals()
      await unref(instance.actions)[0].handler({
        resources: [{ id: '1', name: 'renamed space' } as SpaceResource]
      })

      expect(dispatchModal).toHaveBeenCalledTimes(1)
    })
    it('should not trigger the rename modal window without any resource', async () => {
      const { instance } = getWrapper()
      const { dispatchModal } = useModals()
      await unref(instance.actions)[0].handler({ resources: [] })

      expect(dispatchModal).toHaveBeenCalledTimes(0)
    })
  })
  describe('method "renameSpace"', () => {
    it('should show message on success', async () => {
      const { instance, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
        mock<SpaceResource>()
      )
      await instance.renameSpace(mock<SpaceResource>({ id: '1' }), 'renamed space')

      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
    })

    it('should show message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(new Error())
      await instance.renameSpace(mock<SpaceResource>({ id: '1' }), 'renamed space')

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
    })
  })
})

function getWrapper() {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-projects' })
  })
  let instance: ReturnType<typeof useSpaceActionsRename>
  const wrapper = getComposableWrapper(
    () => {
      instance = useSpaceActionsRename()
    },
    {
      mocks,
      provide: mocks
    }
  )
  return { wrapper, instance, mocks }
}
