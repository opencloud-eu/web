import ContextActionMenu from '../../../../src/components/ContextActions/ContextActionMenu.vue'
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
