import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { computed } from 'vue'
import { Action, ContextActionMenu } from '@opencloud-eu/web-pkg'
import { User } from '@opencloud-eu/web-client/graph/generated'
import ContextActions from '../../../../src/components/Users/ContextActions.vue'
import {
  useUserActionsDelete,
  useUserActionsEdit,
  useUserActionsEditQuota
} from '../../../../src/composables/actions/users'

vi.mock('../../../../src/composables/actions/users/useUserActionsDelete', () => ({
  useUserActionsDelete: vi.fn()
}))
vi.mock('../../../../src/composables/actions/users/useUserActionsEdit', () => ({
  useUserActionsEdit: vi.fn()
}))
vi.mock('../../../../src/composables/actions/users/useUserActionsEditQuota', () => ({
  useUserActionsEditQuota: vi.fn()
}))

function mockActions(...names: string[]) {
  return computed(() => names.map((name) => mock<Action>({ name, isVisible: () => true })))
}

describe('ContextActions', () => {
  beforeEach(() => {
    vi.mocked(useUserActionsEdit).mockReturnValue({ actions: mockActions('edit') })
    vi.mocked(useUserActionsEditQuota).mockReturnValue({ actions: mockActions('edit-quota') })
    vi.mocked(useUserActionsDelete).mockReturnValue({
      actions: mockActions('delete'),
      deleteUsers: vi.fn()
    })
  })

  it('renders the delete action after the other actions and before the details', () => {
    const { wrapper } = getWrapper({ items: [mock<User>()] })

    const sections = getMenuSections(wrapper)
    expect(sections.map(({ name }) => name)).toEqual([
      'primary',
      'secondary',
      'tertiary',
      'quaternary'
    ])
    expect(sections.map(({ items }) => items.map(({ name }) => name))).toEqual([
      ['edit'],
      ['edit-quota'],
      ['delete'],
      ['show-details']
    ])
  })
})

function getMenuSections(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findComponent(ContextActionMenu).props('menuSections') as {
    name: string
    items: Action[]
  }[]
}

function getWrapper({ items }: { items: User[] }) {
  return {
    wrapper: shallowMount(ContextActions, {
      props: { items },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
