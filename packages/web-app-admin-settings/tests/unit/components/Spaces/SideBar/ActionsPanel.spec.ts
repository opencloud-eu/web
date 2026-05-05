import {
  defaultComponentMocks,
  defaultPlugins,
  defaultStubs,
  mount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import ActionsPanel from '../../../../../src/components/Spaces/SideBar/ActionsPanel.vue'
import { Action, useExtensionRegistry } from '@opencloud-eu/web-pkg'
import { h } from 'vue'

const sidebarActionsExtensionPointId = 'app.admin-settings.spaces.sidebar-actions'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => {
  return {
    ...(await importOriginal<any>()),
    useExtensionRegistry: vi.fn(),
    ActionMenuItem: () => h('action-menu-item')
  }
})

describe('ActionsPanel', () => {
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
        mock<Action>({ isVisible: () => true, category: 'secondary' }),
        mock<Action>({ isVisible: () => true, category: 'secondary' }),
        mock<Action>({ isVisible: () => true, category: 'tertiary' }),
        mock<Action>({ isVisible: () => true, category: 'tertiary' })
      ]
      vi.mocked(useExtensionRegistry).mockReturnValue({
        requestExtensions: vi.fn((extensionPoint) => {
          if (extensionPoint.id === sidebarActionsExtensionPointId) {
            return [
              {
                id: 'com.github.opencloud-eu.web.files.spaces.context-action.rename',
                action: enabledActions[0]
              },
              {
                id: 'com.github.opencloud-eu.web.files.spaces.context-action.edit-description',
                action: enabledActions[1]
              },
              {
                id: 'com.github.opencloud-eu.web.files.spaces.batch-action.edit-quota',
                action: enabledActions[2]
              },
              {
                id: 'com.github.opencloud-eu.web.files.spaces.batch-action.disable',
                action: enabledActions[3]
              },
              {
                id: 'com.github.opencloud-eu.web.files.spaces.batch-action.restore',
                action: enabledActions[4]
              }
            ]
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
    wrapper: mount(ActionsPanel, {
      props: {
        items: [mock<Resource>()]
      },
      global: {
        mocks,
        stubs: { ...defaultStubs, 'action-menu-item': true },
        plugins: [...defaultPlugins()]
      }
    })
  }
}
