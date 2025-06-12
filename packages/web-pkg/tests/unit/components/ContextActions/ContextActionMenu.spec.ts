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
    expect(wrapper.find('.oc-files-context-actions').exists()).toBeTruthy()
    expect(wrapper.findAll('.oc-files-context-actions').length).toEqual(menuSections.length)
  })

  it('renders the menu with drop menu items', async () => {
    const menuSections = [
      {
        name: 'apps',
        items: [],
        drop: {
          label: 'Apps',
          name: 'apps',
          items: [{ label: () => 'Preview' } as Action, { label: () => 'PDF Viewer' } as Action]
        }
      },
      {
        name: 'actions',
        items: [{ label: () => 'Download' } as Action],
        drop: {
          label: 'Actions',
          name: 'actions',
          items: [{ label: () => 'Copy' } as Action, { label: () => 'Paste' } as Action]
        }
      },
      {
        name: 'sidebar',
        items: [{ label: () => 'Details' } as Action]
      }
    ]
    const { wrapper } = getWrapper(menuSections)
    expect(wrapper.html()).toMatchSnapshot()

    expect(wrapper.findAll('.oc-files-context-actions').length).toEqual(menuSections.length)
    expect(wrapper.findAll('.oc-files-context-action-drop').length).toEqual(
      menuSections.filter((m) => m.drop).length
    )
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
