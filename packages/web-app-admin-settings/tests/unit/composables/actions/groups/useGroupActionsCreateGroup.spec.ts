import { useModals } from '@opencloud-eu/web-pkg'
import { useGroupActionsCreateGroup } from '../../../../../src/composables/actions/groups/useGroupActionsCreateGroup'
import { unref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'

describe('useGroupActionsCreateGroup', () => {
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
    it('focuses the display name input initially', () => {
      getWrapper({
        setup: ({ actions }) => {
          const { dispatchModal } = useModals()
          unref(actions)[0].handler()
          expect(dispatchModal).toHaveBeenCalledWith(
            expect.objectContaining({ focusTrapInitial: '#create-group-input-display-name' })
          )
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (instance: ReturnType<typeof useGroupActionsCreateGroup>) => void
}) {
  return {
    wrapper: getComposableWrapper(() => {
      const instance = useGroupActionsCreateGroup()
      setup(instance)
    })
  }
}
