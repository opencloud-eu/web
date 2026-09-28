import { Resource } from '@opencloud-eu/web-client'
import { SideBarNoSelection } from '@opencloud-eu/web-pkg'
import TrashNoSelection from '../../../../src/components/SideBar/TrashNoSelection.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'

describe('TrashNoSelection', () => {
  it('shows the amount of trash bins', () => {
    const { wrapper } = createWrapper([{ id: '1' }, { id: '2' }] as Resource[])
    expect(wrapper.findComponent(SideBarNoSelection).props('details')).toEqual([
      { term: 'Items', definition: '2 trash bins' }
    ])
  })
  it('shows zero trash bins if there are none', () => {
    const { wrapper } = createWrapper([])
    expect(wrapper.findComponent(SideBarNoSelection).props('details')).toEqual([
      { term: 'Items', definition: '0 trash bins' }
    ])
  })
})

function createWrapper(resources: Resource[]) {
  return {
    wrapper: shallowMount(TrashNoSelection, {
      global: { plugins: [...defaultPlugins({ piniaOptions: { resourcesStore: { resources } } })] }
    })
  }
}
