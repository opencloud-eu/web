import SpaceNoSelection from '../../../../../src/components/SideBar/Spaces/SpaceNoSelection.vue'
import SideBarNoSelection from '../../../../../src/components/SideBar/SideBarNoSelection.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'

describe('SpaceNoSelection', () => {
  it('shows the amount of spaces', () => {
    const { wrapper } = createWrapper(3)
    expect(wrapper.findComponent(SideBarNoSelection).props('details')).toEqual([
      { term: 'Items', definition: '3 spaces' }
    ])
  })
  it('shows zero spaces if there are none', () => {
    const { wrapper } = createWrapper(0)
    expect(wrapper.findComponent(SideBarNoSelection).props('details')).toEqual([
      { term: 'Items', definition: '0 spaces' }
    ])
  })
})

function createWrapper(spacesCount: number) {
  return {
    wrapper: shallowMount(SpaceNoSelection, {
      props: { spacesCount },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
