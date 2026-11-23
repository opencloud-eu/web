import { useUserActionsAddToGroups } from '../../../../../src/composables/actions/users/useUserActionsAddToGroups'
import { mock } from 'vitest-mock-extended'
import { ref, unref } from 'vue'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { getComposableWrapper, writable } from '@opencloud-eu/web-test-helpers'
import { useCapabilityStore, useModals } from '@opencloud-eu/web-pkg'

describe('useUserActionsAddToGroups', () => {
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
          writable(capabilityStore).graphUsersReadOnlyAttributes = ['user.memberOf']

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
  setup?: (instance: ReturnType<typeof useUserActionsAddToGroups>) => void
} = {}) {
  let instance: ReturnType<typeof useUserActionsAddToGroups>
  const wrapper = getComposableWrapper(() => {
    instance = useUserActionsAddToGroups({ groups: ref([]) })
    setup?.(instance)
  })
  return { wrapper, instance }
}
