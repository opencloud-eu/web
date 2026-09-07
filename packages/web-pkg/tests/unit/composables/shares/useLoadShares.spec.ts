import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useLoadShares } from '../../../../src/composables/shares/useLoadShares'
import { useSharesStore } from '../../../../src/composables/piniaStores'

describe('useLoadShares', () => {
  describe('loadSharesTask', () => {
    it('updates the shares store', async () => {
      const { instance, sharesStore } = getWrapper()

      await instance.loadSharesTask.perform({
        space: mock<SpaceResource>({ id: 'space-id' }),
        resource: mock<Resource>({ id: 'resource-id' })
      })

      expect(sharesStore.setLoading).toHaveBeenCalled()
      expect(sharesStore.removeOrphanedShares).toHaveBeenCalled()
      expect(sharesStore.setCollaboratorShares).toHaveBeenCalled()
      expect(sharesStore.setLinkShares).toHaveBeenCalled()
    })

    it('leaves the shares store untouched when updating it is disabled', async () => {
      const { instance, sharesStore } = getWrapper()

      await instance.loadSharesTask.perform({
        space: mock<SpaceResource>({ id: 'space-id' }),
        resource: mock<Resource>({ id: 'resource-id' }),
        updateStore: false
      })

      expect(sharesStore.setLoading).not.toHaveBeenCalled()
      expect(sharesStore.removeOrphanedShares).not.toHaveBeenCalled()
      expect(sharesStore.setCollaboratorShares).not.toHaveBeenCalled()
      expect(sharesStore.setLinkShares).not.toHaveBeenCalled()
    })
  })
})

function getWrapper() {
  const mocks = defaultComponentMocks()
  mocks.$clientService.graphAuthenticated.permissions.listPermissions.mockResolvedValue({
    shares: [],
    allowedActions: [],
    allowedRoles: []
  })

  let instance!: ReturnType<typeof useLoadShares>
  let sharesStore!: ReturnType<typeof useSharesStore>

  const wrapper = getComposableWrapper(
    () => {
      sharesStore = useSharesStore()
      instance = useLoadShares()
    },
    { mocks, provide: mocks }
  )

  return { wrapper, instance, sharesStore, mocks }
}
