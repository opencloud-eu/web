import { unref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useModals, useSpaceActionsCreate } from '../../../../../src'

describe('useSpaceActionsCreateSpace', () => {
  describe('method "isVisible"', () => {
    it.each([true, false])('is enabled based on the capability', (canCreate) => {
      getWrapper({
        abilities: canCreate ? [{ action: 'create-all', subject: 'Drive' }] : [],
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible()).toEqual(canCreate)
        }
      })
    })
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
  })
})

function getWrapper({
  setup,
  abilities = []
}: {
  setup: (instance: ReturnType<typeof useSpaceActionsCreate>) => void
  abilities?: any[]
}) {
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsCreate()
        setup(instance)
      },
      { pluginOptions: { abilities } }
    )
  }
}
