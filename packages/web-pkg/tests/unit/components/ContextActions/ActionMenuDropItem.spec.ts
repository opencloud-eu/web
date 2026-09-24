import ActionMenuDropItem from '../../../../src/components/ContextActions/ActionMenuDropItem.vue'
import { Action } from '../../../../src/composables/actions'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { MenuSectionDrop } from '../../../../src/components/ContextActions'

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
    expect(wrapper.find('.oc-files-context-action-drop').findAll('li').length).toEqual(
      menuSectionDrop.items.length
    )
  })

  it('renders a separate list per item group', () => {
    const copy = { label: () => 'Copy' } as Action
    const paste = { label: () => 'Paste' } as Action
    const menuSectionDrop = {
      label: 'Actions',
      name: 'actions',
      icon: 'eye',
      items: [copy, paste],
      itemGroups: [[copy], [paste]]
    }
    const { wrapper } = getWrapper(menuSectionDrop)
    const lists = wrapper.find('.oc-files-context-action-drop').findAll('ul')
    expect(lists.length).toEqual(2)
    expect(lists[0].classes()).toContain('border-b')
    expect(lists[1].classes()).not.toContain('border-b')
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
        plugins: [...defaultPlugins()],
        renderStubDefaultSlot: true,
        stubs: { OcDrop: true }
      }
    })
  }
}
