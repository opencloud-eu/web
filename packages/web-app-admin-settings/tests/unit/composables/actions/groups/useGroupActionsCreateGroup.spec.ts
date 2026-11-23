import { useModals } from '@opencloud-eu/web-pkg'
import { useGroupActionsCreateGroup } from '../../../../../src/composables/actions/groups/useGroupActionsCreateGroup'
import { unref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'

describe('useGroupActionsCreateGroup', () => {
  describe('method "handler"', () => {
    it('creates a modal', async () => {
      const { instance } = getWrapper()
      const { dispatchModal } = useModals()
      await unref(instance.actions)[0].handler()
      expect(dispatchModal).toHaveBeenCalled()
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
  setup?: (instance: ReturnType<typeof useGroupActionsCreateGroup>) => void
} = {}) {
  let instance: ReturnType<typeof useGroupActionsCreateGroup>
  const wrapper = getComposableWrapper(() => {
    instance = useGroupActionsCreateGroup()
    setup?.(instance)
  })
  return { wrapper, instance }
}
