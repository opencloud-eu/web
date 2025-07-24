import {
  defaultComponentMocks,
  defaultPlugins,
  defaultStubs,
  mount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import ActionsPanel from '../../../../../src/components/Spaces/SideBar/ActionsPanel.vue'
import {
  useSpaceActionsDisable,
  useSpaceActionsEditDescription,
  useSpaceActionsEditQuota,
  useSpaceActionsRename
} from '@opencloud-eu/web-pkg'
import { computed, ref } from 'vue'
import { Action } from '@opencloud-eu/web-pkg'

function createMockActionComposables(module: Record<string, any>) {
  const mockModule: Record<string, any> = {}
  for (const m of Object.keys(module)) {
    mockModule[m] = vi.fn(() => ({ actions: ref([]) }))
  }
  return mockModule
}

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...createMockActionComposables(original),
    ActionMenuItem: (h) => h('action-menu-item')
  }
})

describe('ActionsPanel', () => {
  describe('menu sections', () => {
    it('do not render when no action enabled', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.findAll('action-menu-item-stub').length).toBe(0)
    })

    it('render enabled actions', () => {
      const enabledComposables = [
        useSpaceActionsRename,
        useSpaceActionsEditDescription,
        useSpaceActionsEditQuota,
        useSpaceActionsDisable
      ]

      for (const composable of enabledComposables) {
        vi.mocked(composable).mockImplementation(() => ({
          actions: computed(() => [mock<Action>({ isVisible: () => true })]),
          checkName: null,
          renameSpace: null,
          editDescriptionSpace: null,
          selectedSpace: null,
          modalOpen: null,
          closeModal: null,
          spaceQuotaUpdated: null,
          disableSpaces: null
        }))
      }

      const { wrapper } = getWrapper()
      expect(wrapper.findAll('action-menu-item-stub').length).toBe(enabledComposables.length)
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
