import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { SpaceResource } from '@opencloud-eu/web-client'
import ContextActions from '../../../../src/components/Spaces/ContextActions.vue'
import { Action, ContextActionMenu, useFileActions } from '@opencloud-eu/web-pkg'
import { spacesContextActionsExtensionPoint } from '../../../../src/extensionPoints'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActions: vi.fn()
}))

describe('ContextActions', () => {
  it('requests the actions of the spaces context actions extension point', () => {
    const { getExtensionActions } = getWrapper()
    expect(getExtensionActions).toHaveBeenCalledWith(spacesContextActionsExtensionPoint.id)
  })

  it('renders no menu sections when no action is available', () => {
    const { wrapper } = getWrapper()
    expect(getMenuSections(wrapper)).toEqual([])
  })

  it('groups the visible actions into menu sections by category', () => {
    const actions = [
      mock<Action>({ name: 'rename', isVisible: () => true, category: 'primary' }),
      mock<Action>({ name: 'edit-description', isVisible: () => true, category: 'secondary' }),
      mock<Action>({ name: 'edit-quota', isVisible: () => true, category: 'secondary' }),
      mock<Action>({ name: 'disable', isVisible: () => true, category: 'tertiary' }),
      mock<Action>({ name: 'restore', isVisible: () => true, category: 'tertiary' }),
      mock<Action>({ name: 'details', isVisible: () => true, category: 'quaternary' })
    ]
    const { wrapper } = getWrapper({ actions })

    expect(
      getMenuSections(wrapper).map(({ name, items }) => ({
        name,
        items: items.map((item: Action) => item.name)
      }))
    ).toEqual([
      { name: 'primary', items: ['rename'] },
      { name: 'secondary', items: ['edit-description', 'edit-quota'] },
      { name: 'tertiary', items: ['disable', 'restore'] },
      { name: 'quaternary', items: ['details'] }
    ])
  })

  it('omits invisible actions and checks visibility against the given spaces', () => {
    const space = mock<SpaceResource>({ id: '1' })
    const isVisible = vi.fn(() => false)
    const actions = [
      mock<Action>({ name: 'rename', isVisible: () => true, category: 'primary' }),
      mock<Action>({ name: 'disable', isVisible, category: 'tertiary' })
    ]
    const { wrapper } = getWrapper({ actions, items: [space] })

    expect(getMenuSections(wrapper).map(({ name }) => name)).toEqual(['primary'])
    expect(isVisible).toHaveBeenCalledWith({ resources: [space], space: undefined })
  })
})

function getMenuSections(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findComponent(ContextActionMenu).props('menuSections') as {
    name: string
    items: Action[]
  }[]
}

function getWrapper({
  actions = [],
  items = [mock<SpaceResource>()]
}: { actions?: Action[]; items?: SpaceResource[] } = {}) {
  const getExtensionActions = vi.fn(() => actions)
  vi.mocked(useFileActions).mockReturnValue(
    mock<ReturnType<typeof useFileActions>>({ getExtensionActions })
  )
  const mocks = defaultComponentMocks()

  return {
    getExtensionActions,
    mocks,
    wrapper: shallowMount(ContextActions, {
      props: { items },
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
