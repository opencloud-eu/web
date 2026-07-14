import ContextActionMenu from '../../../../src/components/ContextActions/ContextActionMenu.vue'
import ActionMenuDropItem from '../../../../src/components/ContextActions/ActionMenuDropItem.vue'
import { Action } from '../../../../src/composables/actions'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'

describe('ContextActionMenu component', () => {
  it('renders the menu with actions', () => {
    const menuSections = [
      { name: 'section 1', items: [] as Action[] },
      { name: 'section 2', items: [] as Action[] }
    ]
    const { wrapper } = getWrapper(menuSections)
    expect(wrapper.html()).toMatchSnapshot()

    expect(wrapper.find('#oc-files-context-menu > ul').exists()).toBeTruthy()
    expect(wrapper.findAll('#oc-files-context-menu > ul').length).toEqual(menuSections.length)
  })

  it('renders the menu with drop menu items', () => {
    const menuSections = [
      {
        name: 'apps',
        items: [],
        dropItems: [
          {
            label: 'Apps',
            name: 'apps',
            items: [{ label: () => 'Preview' } as Action, { label: () => 'PDF Viewer' } as Action]
          }
        ]
      },
      {
        name: 'actions',
        items: [{ label: () => 'Download' } as Action],
        dropItems: [
          {
            label: 'Actions',
            name: 'actions',
            items: [{ label: () => 'Copy' } as Action, { label: () => 'Paste' } as Action]
          },
          {
            label: 'Delete',
            name: 'delete',
            items: [
              { label: () => 'Delete' } as Action,
              { label: () => 'Delete permanently' } as Action
            ]
          }
        ]
      },
      {
        name: 'sidebar',
        items: [{ label: () => 'Details' } as Action]
      }
    ]
    const { wrapper } = getWrapper(menuSections)
    expect(wrapper.html()).toMatchSnapshot()

    expect(wrapper.findAll('#oc-files-context-menu > ul').length).toEqual(menuSections.length)
  })

  it('renders action children as a nested drop menu', () => {
    const menuSections = [
      {
        name: 'archive',
        items: [
          {
            name: 'create-archive',
            icon: 'inbox-archive',
            class: 'oc-files-actions-create-archive',
            label: () => 'Create Archive',
            isVisible: () => true,
            children: [
              {
                name: 'create-zip-archive',
                icon: 'inbox-archive',
                class: 'oc-files-actions-create-zip-archive',
                label: () => 'ZIP archive',
                isVisible: () => true,
                handler: vi.fn()
              },
              {
                name: 'create-hidden-archive',
                icon: 'inbox-archive',
                class: 'oc-files-actions-create-hidden-archive',
                label: () => 'Hidden archive',
                isVisible: () => false,
                handler: vi.fn()
              }
            ]
          } as Action
        ]
      }
    ]
    const { wrapper } = getWrapper(menuSections)

    const drop = wrapper.findComponent(ActionMenuDropItem)
    expect(drop.exists()).toBeTruthy()
    expect(drop.props('menuSectionDrop').items.map((item: Action) => item.name)).toEqual([
      'create-zip-archive'
    ])
  })
})

function getWrapper(menuSections: { name: string; items: Action[] }[]) {
  return {
    wrapper: mount(ContextActionMenu, {
      props: {
        menuSections,
        actionOptions: { resources: [] }
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
