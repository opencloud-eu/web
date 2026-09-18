import { useSpaceActionsDisable } from '../../../../../src/composables/actions/spaces'
import { useMessages, useModals, useVaultStore, VaultStore } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { User } from '@opencloud-eu/web-client/graph/generated'

let claim: { vaultRoot: string } | null = null
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@opencloud-eu/web-pkg')>()),
  getSpaceVaultClaim: vi.fn(() => claim)
}))

beforeEach(() => {
  claim = null
})

const projectSpace = (id: string) =>
  mock<SpaceResource>({ id, canDisable: () => true, driveType: 'project' })

describe('disable', () => {
  describe('isVisible property', () => {
    it('should be false when no resource given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be true when the space can be disabled', () => {
      const spaceMock = mock<SpaceResource>({ driveType: 'project', canDisable: () => true })
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [spaceMock] })).toBe(true)
        }
      })
    })
    it('should be false when the space can not be disabled', () => {
      const spaceMock = mock<SpaceResource>({ driveType: 'project', canDisable: () => false })
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [spaceMock] })).toBe(false)
        }
      })
    })
  })

  describe('handler', () => {
    it('should trigger the disable modal window', () => {
      getWrapper({
        setup: async ({ actions }) => {
          const { dispatchModal } = useModals()
          await unref(actions)[0].handler({
            resources: [
              mock<SpaceResource>({ id: '1', canDisable: () => true, driveType: 'project' })
            ]
          })

          expect(dispatchModal).toHaveBeenCalledTimes(1)
        }
      })
    })
    it('should not trigger the disable modal window without any resource', () => {
      getWrapper({
        setup: async ({ actions }) => {
          const { dispatchModal } = useModals()
          await unref(actions)[0].handler({
            resources: [
              mock<SpaceResource>({ id: '1', canDisable: () => false, driveType: 'project' })
            ]
          })

          expect(dispatchModal).toHaveBeenCalledTimes(0)
        }
      })
    })
  })

  describe('method "disableSpace"', () => {
    it('should show message on success', () => {
      getWrapper({
        setup: async ({ disableSpaces }, { clientService }) => {
          clientService.graphAuthenticated.drives.disableDrive.mockResolvedValue()
          await disableSpaces([
            mock<SpaceResource>({ id: '1', canDisable: () => true, driveType: 'project' })
          ])

          const { showMessage } = useMessages()
          expect(showMessage).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('should show message on error', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      getWrapper({
        setup: async ({ disableSpaces }, { clientService }) => {
          clientService.graphAuthenticated.drives.disableDrive.mockRejectedValue(new Error())
          await disableSpaces([
            mock<SpaceResource>({ id: '1', canDisable: () => true, driveType: 'project' })
          ])

          const { showErrorMessage } = useMessages()
          expect(showErrorMessage).toHaveBeenCalledTimes(1)
        }
      })
    })
  })

  describe('vault locking', () => {
    it('should lock the space when it is a vault space', async () => {
      claim = { vaultRoot: '/' }
      const { disableSpaces, vaultStore, clientService } = getDisableSpaces()
      clientService.graphAuthenticated.drives.disableDrive.mockResolvedValue()

      await disableSpaces([projectSpace('1')])

      expect(vaultStore.clearEngine).toHaveBeenCalledWith('1', '/')
    })

    it('should lock every disabled vault space of a multi-selection', async () => {
      claim = { vaultRoot: '/' }
      const { disableSpaces, vaultStore, clientService } = getDisableSpaces()
      clientService.graphAuthenticated.drives.disableDrive.mockResolvedValue()

      await disableSpaces([projectSpace('1'), projectSpace('2')])

      expect(vaultStore.clearEngine).toHaveBeenCalledWith('1', '/')
      expect(vaultStore.clearEngine).toHaveBeenCalledWith('2', '/')
    })

    it('should not lock a space that is no vault space', async () => {
      const { disableSpaces, vaultStore, clientService } = getDisableSpaces()
      clientService.graphAuthenticated.drives.disableDrive.mockResolvedValue()

      await disableSpaces([projectSpace('1')])

      expect(vaultStore.clearEngine).not.toHaveBeenCalled()
    })

    it('should not lock the space when disabling it failed', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      claim = { vaultRoot: '/' }
      const { disableSpaces, vaultStore, clientService } = getDisableSpaces()
      clientService.graphAuthenticated.drives.disableDrive.mockRejectedValue(new Error())

      await disableSpaces([projectSpace('1')])

      expect(vaultStore.clearEngine).not.toHaveBeenCalled()
    })
  })
})

function getDisableSpaces() {
  let disableSpaces: ReturnType<typeof useSpaceActionsDisable>['disableSpaces']
  let vaultStore: VaultStore
  const { mocks } = getWrapper({
    setup: (instance) => {
      disableSpaces = instance.disableSpaces
      vaultStore = useVaultStore()
    }
  })
  return { disableSpaces, vaultStore, clientService: mocks.$clientService }
}

function getWrapper({
  setup
}: {
  setup: (
    instance: ReturnType<typeof useSpaceActionsDisable>,
    {
      clientService
    }: {
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-projects' })
  })
  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsDisable()
        setup(instance, { clientService: mocks.$clientService })
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
  }
}
