import { useUserActionsEditLogin } from '../../../../../src/composables/actions/users/useUserActionsEditLogin'
import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { getComposableWrapper, writable } from '@opencloud-eu/web-test-helpers'
import { useCapabilityStore, useModals } from '@opencloud-eu/web-pkg'

describe('useUserActionsEditLogin', () => {
  describe('method "isVisible"', () => {
    it.each([
      { resources: [], isVisible: false },
      { resources: [mock<User>()], isVisible: true },
      { resources: [mock<User>(), mock<User>()], isVisible: true }
    ])('requires at least one user to be enabled', ({ resources, isVisible }) => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources })).toEqual(isVisible)
        }
      })
    })
    it('returns false if included in capability readOnlyUserAttributes list', () => {
      getWrapper({
        setup: ({ actions }) => {
          const capabilityStore = useCapabilityStore()
          writable(capabilityStore).graphUsersReadOnlyAttributes = ['user.accountEnabled']

          expect(unref(actions)[0].isVisible({ resources: [mock<User>()] })).toEqual(false)
        }
      })
    })
  })
  describe('method "handler"', () => {
    it('creates a modal', async () => {
      const { instance } = getWrapper()
      const { dispatchModal } = useModals()
      await unref(instance.actions)[0].handler({ resources: [mock<User>()] })
      expect(dispatchModal).toHaveBeenCalled()
    })
  })
})

function getWrapper({
  setup
}: {
  setup?: (instance: ReturnType<typeof useUserActionsEditLogin>) => void
} = {}) {
  let instance: ReturnType<typeof useUserActionsEditLogin>
  const wrapper = getComposableWrapper(() => {
    instance = useUserActionsEditLogin()
    setup?.(instance)
  })
  return { wrapper, instance }
}
