import ActionMenuDropItem from '../../../../src/components/ContextActions/ActionMenuDropItem.vue'
import { Action } from '../../../../src/composables/actions'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { MenuSectionDrop } from '../../../../src/components/ContextActions/ContextActionMenu.vue'

describe('ActionMenuDropItem component', () => {
  it('renders drop menu with actions', () => {
    const menuSectionDrop = {
      label: 'Actions',
      name: 'actions',
      icon: 'eye',
      items: [{ label: () => 'Copy' } as Action, { label: () => 'Paste' } as Action]
    }
    const { wrapper } = getWrapper(menuSectionDrop)
    expect(wrapper.html()).toMatchSnapshot()
    expect(
      wrapper.find('.oc-files-context-action-drop').findAll('.oc-files-context-action').length
    ).toEqual(menuSectionDrop.items.length)
  })
  it('renders drop menu with empty message', () => {
    const menuSectionDrop = {
      label: 'Actions',
      name: 'actions',
      icon: 'eye',
      renderOnEmpty: true,
      items: []
    }
    const { wrapper } = getWrapper(menuSectionDrop)
    expect(wrapper.find('.oc-files-context-action-drop-empty-message').exists()).toBeTruthy()
  })
})

function getWrapper(menuSectionDrop: MenuSectionDrop) {
  return {
    wrapper: mount(ActionMenuDropItem, {
      props: {
        menuSectionDrop,
        actionOptions: { resources: [] },
        appearance: 'outline'
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
