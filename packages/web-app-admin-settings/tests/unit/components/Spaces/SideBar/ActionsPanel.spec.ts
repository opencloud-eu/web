import {
  defaultComponentMocks,
  defaultPlugins,
  defaultStubs,
  mount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import ActionsPanel from '../../../../../src/components/Spaces/SideBar/ActionsPanel.vue'
import { Action, FileAction, useFileActions } from '@opencloud-eu/web-pkg'
import { h } from 'vue'
import { spacesSidebarActionsExtensionPoint } from '../../../../../src/extensionPoints'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => {
  return {
    ...(await importOriginal<any>()),
    useFileActions: vi.fn(),
    ActionMenuItem: () => h('action-menu-item')
  }
})

describe('ActionsPanel', () => {
  describe('menu sections', () => {
    it('do not render when no action enabled', () => {
      const { wrapper } = getWrapper([])
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

      const { wrapper } = getWrapper(enabledActions)
      expect(wrapper.findAll('action-menu-item-stub').length).toBe(enabledActions.length)
    })
  })
})

function getWrapper(extensionActions: Action[] = []) {
  vi.mocked(useFileActions).mockReturnValue(
    mock<ReturnType<typeof useFileActions>>({
      getExtensionActions: vi.fn((extensionPoint) =>
        extensionPoint === spacesSidebarActionsExtensionPoint.id
          ? (extensionActions as FileAction[])
          : []
      )
    })
  )

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
