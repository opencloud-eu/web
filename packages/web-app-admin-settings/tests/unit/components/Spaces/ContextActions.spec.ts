import {
  defaultComponentMocks,
  defaultPlugins,
  defaultStubs,
  mount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { SpaceResource } from '@opencloud-eu/web-client'
import ContextActions from '../../../../src/components/Spaces/ContextActions.vue'
import { Action, useExtensionRegistry } from '@opencloud-eu/web-pkg'

const contextActionsExtensionPointId = 'global.files.context-actions'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => {
  return {
    ...(await importOriginal<any>()),
    useExtensionRegistry: vi.fn()
  }
})

describe.skip('ContextActions', () => {
  describe('menu sections', () => {
    it('do not render when no action enabled', () => {
      vi.mocked(useExtensionRegistry).mockReturnValue({
        requestExtensions: vi.fn(() => [])
      } as any)

      const { wrapper } = getWrapper()
      expect(wrapper.findAll('action-menu-item-stub').length).toBe(0)
    })

    it('render enabled actions', () => {
      const enabledActions = [
        mock<Action>({ isVisible: () => true, category: 'primary' }),
        mock<Action>({ isVisible: () => true, category: 'primary' }),
        mock<Action>({ isVisible: () => true, category: 'secondary' }),
        mock<Action>({ isVisible: () => true, category: 'secondary' })
      ]

      vi.mocked(useExtensionRegistry).mockReturnValue({
        requestExtensions: vi.fn((extensionPoint) => {
          if (extensionPoint.id === contextActionsExtensionPointId) {
            return enabledActions.map((action) => ({ action }))
          }
          return []
        })
      } as any)

      const { wrapper } = getWrapper()
      expect(wrapper.findAll('action-menu-item-stub').length).toBe(enabledActions.length)
    })
  })
})

function getWrapper() {
  const mocks = {
    ...defaultComponentMocks()
  }
  return {
    mocks,
    wrapper: mount(ContextActions, {
      props: {
        items: [mock<SpaceResource>()]
      },
      global: {
        mocks,
        stubs: { ...defaultStubs, 'action-menu-item': true },
        plugins: [...defaultPlugins()]
      }
    })
  }
}
