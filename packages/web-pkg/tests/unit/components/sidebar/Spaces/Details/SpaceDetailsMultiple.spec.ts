import { SpaceResource } from '@opencloud-eu/web-client'
import SpaceDetailsMultiple from '../../../../../../src/components/SideBar/Spaces/Details/SpaceDetailsMultiple.vue'
import SideBarMultipleSelection from '../../../../../../src/components/SideBar/SideBarMultipleSelection.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'

const spaceMock = {
  type: 'space',
  name: ' space',
  id: '1',
  mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  spaceQuota: {
    used: 100,
    total: 1000,
    remaining: 900
  }
} as unknown as SpaceResource

describe('Multiple Details SideBar Panel', () => {
  it('displays the amount of selected spaces and their quota', () => {
    const { wrapper } = createWrapper(spaceMock)
    const overview = wrapper.findComponent(SideBarMultipleSelection)

    expect(overview.props('imgSrc')).toBe('images/illustrations/spaces.svg')
    expect(overview.props('message')).toBe('1 space selected')
    expect(overview.props('details')).toEqual([
      { term: 'Total quota', definition: '1 kB' },
      { term: 'Remaining quota', definition: '900 B' },
      { term: 'Used quota', definition: '100 B' },
      { term: 'Enabled', definition: '1' },
      { term: 'Disabled', definition: '0' }
    ])
  })
})

function createWrapper(spaceResource: SpaceResource) {
  return {
    wrapper: shallowMount(SpaceDetailsMultiple, {
      global: {
        plugins: [...defaultPlugins()]
      },
      props: {
        selectedSpaces: [spaceResource]
      }
    })
  }
}
