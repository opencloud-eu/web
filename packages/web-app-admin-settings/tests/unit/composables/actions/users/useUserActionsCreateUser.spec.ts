import { useCapabilityStore, useModals } from '@opencloud-eu/web-pkg'
import { useUserActionsCreateUser } from '../../../../../src/composables/actions/users/useUserActionsCreateUser'
import { unref } from 'vue'
import { getComposableWrapper, writable } from '@opencloud-eu/web-test-helpers'

describe('useUserActionsCreateUser', () => {
  describe('method "isVisible"', () => {
    it.each([true, false])(
      'is enabled based on the capability',
      (capabilityCreateUsersDisabled) => {
        getWrapper({
          setup: ({ actions }) => {
            const capabilityStore = useCapabilityStore()
            writable(capabilityStore).graphUsersCreateDisabled = capabilityCreateUsersDisabled
            expect(unref(actions)[0].isVisible()).toEqual(!capabilityCreateUsersDisabled)
          }
        })
      }
    )
  })
  describe('method "handler"', () => {
    it('creates a modal', () => {
      getWrapper({
        setup: async ({ actions }) => {
          const { dispatchModal } = useModals()
          await unref(actions)[0].handler()
          expect(dispatchModal).toHaveBeenCalled()
        }
      })
    })
    it('focuses the user name input initially', () => {
      getWrapper({
        setup: ({ actions }) => {
          const { dispatchModal } = useModals()
          unref(actions)[0].handler()
          expect(dispatchModal).toHaveBeenCalledWith(
            expect.objectContaining({ focusTrapInitial: '#create-user-input-user-name' })
          )
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (instance: ReturnType<typeof useUserActionsCreateUser>) => void
}) {
  return {
    wrapper: getComposableWrapper(() => {
      const instance = useUserActionsCreateUser()
      setup(instance)
    })
  }
}
