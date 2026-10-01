import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { computed } from 'vue'
import { Action, ContextActionMenu, GroupActionOptions } from '@opencloud-eu/web-pkg'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import ContextActions from '../../../../src/components/Groups/ContextActions.vue'
import { useGroupActionsDelete, useGroupActionsEdit } from '../../../../src/composables/actions'

vi.mock('../../../../src/composables/actions/groups/useGroupActionsDelete', () => ({
  useGroupActionsDelete: vi.fn()
}))
vi.mock('../../../../src/composables/actions/groups/useGroupActionsEdit', () => ({
  useGroupActionsEdit: vi.fn()
}))

function mockActions(...names: string[]) {
  return computed(() => names.map((name) => mock<Action>({ name, isVisible: () => true })))
}

describe('ContextActions', () => {
  beforeEach(() => {
    vi.mocked(useGroupActionsDelete).mockReturnValue({
      actions: mockActions(),
      deleteGroups: vi.fn()
    })
    vi.mocked(useGroupActionsEdit).mockReturnValue({ actions: mockActions() })
  })

  it('renders no menu sections if no action is visible', () => {
    const { wrapper } = getWrapper({ resources: [] })
    expect(getMenuSections(wrapper)).toEqual([])
  })

  it('renders edit and delete actions in the primary section', () => {
    vi.mocked(useGroupActionsEdit).mockReturnValue({ actions: mockActions('edit') })
    vi.mocked(useGroupActionsDelete).mockReturnValue({
      actions: mockActions('delete'),
      deleteGroups: vi.fn()
    })
    const { wrapper } = getWrapper({ resources: [] })

    const sections = getMenuSections(wrapper)
    expect(sections.map(({ name }) => name)).toEqual(['primary'])
    expect(sections[0].items.map(({ name }) => name)).toEqual(['edit', 'delete'])
  })

  it('renders the show details action in the quaternary section if a group is given', () => {
    const { wrapper } = getWrapper({ resources: [mock<Group>()] })

    const sections = getMenuSections(wrapper)
    expect(sections.map(({ name }) => name)).toEqual(['quaternary'])
    expect(sections[0].items.map(({ name }) => name)).toEqual(['show-details'])
  })

  it('passes the action options to the menu', () => {
    const actionOptions = { resources: [mock<Group>()] }
    const { wrapper } = getWrapper(actionOptions)
    expect(wrapper.findComponent(ContextActionMenu).props('actionOptions')).toEqual(actionOptions)
  })
})

function getMenuSections(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findComponent(ContextActionMenu).props('menuSections') as {
    name: string
    items: Action[]
  }[]
}

function getWrapper(actionOptions: GroupActionOptions) {
  return {
    wrapper: shallowMount(ContextActions, {
      props: { actionOptions },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
