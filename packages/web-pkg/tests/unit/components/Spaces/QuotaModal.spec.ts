import QuotaModal from '../../../../src/components/Spaces/QuotaModal.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  defaultStubs,
  mount
} from '@opencloud-eu/web-test-helpers'
import { useMessages, useSpacesStore } from '../../../../src/composables/piniaStores'
import { SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'

describe('QuotaModal', () => {
  describe('method "editQuota"', () => {
    it('should show message on success', async () => {
      const { wrapper, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
        mock<SpaceResource>({
          id: '1fe58d8b-aa69-4c22-baf7-97dd57479f22',
          name: 'any',
          spaceQuota: {
            remaining: 9999999836,
            state: 'normal',
            total: 10000000000,
            used: 164
          }
        })
      )
      await wrapper.vm.onConfirm()

      expect(mocks.$clientService.graphAuthenticated.drives.updateDrive).toHaveBeenCalledWith(
        '1fe58d8b-aa69-4c22-baf7-97dd57479f22',
        { quota: { total: expect.any(Number) } }
      )
      const spacesStore = useSpacesStore()
      expect(spacesStore.updateSpaceField).toHaveBeenCalledTimes(1)
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
    })

    it('should show message on server error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(new Error())
      await wrapper.vm.onConfirm()

      const spacesStore = useSpacesStore()
      expect(spacesStore.updateSpaceField).toHaveBeenCalledTimes(0)
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
    })
  })
})

function getWrapper() {
  const mocks = defaultComponentMocks()
  return {
    mocks,
    wrapper: mount(QuotaModal, {
      props: {
        modal: undefined,
        spaces: [
          {
            id: '1fe58d8b-aa69-4c22-baf7-97dd57479f22',
            name: 'Dr. John Smith',
            spaceQuota: {
              remaining: 9999999836,
              state: 'normal',
              total: 10000000000,
              used: 164
            }
          } as SpaceResource
        ]
      },
      global: {
        stubs: { ...defaultStubs },
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
