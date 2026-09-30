import DetailsPanel from '../../../../../src/components/Groups/SideBar/DetailsPanel.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { SideBarNoSelection } from '@opencloud-eu/web-pkg'

const selectors = {
  groupDetails: '#oc-group-details-sidebar',
  multipleGroups: '#oc-groups-details-multiple-sidebar'
}

describe('DetailsPanel', () => {
  describe('no groups given', () => {
    it('renders the no selection info', () => {
      const { wrapper } = getWrapper({ groups: [] })
      expect(wrapper.findComponent(SideBarNoSelection).exists()).toBeTruthy()
      expect(wrapper.find(selectors.groupDetails).exists()).toBeFalsy()
      expect(wrapper.find(selectors.multipleGroups).exists()).toBeFalsy()
    })
    it.each([
      [0, '0 groups'],
      [1, '1 group'],
      [9, '9 groups']
    ])('shows a groups count of %s as "%s"', (groupsCount, definition) => {
      const { wrapper } = getWrapper({ groups: [], groupsCount })
      expect(wrapper.findComponent(SideBarNoSelection).props('details')).toEqual([
        { term: 'Items', definition }
      ])
    })
  })

  describe('one group given', () => {
    it('renders the group details', () => {
      const { wrapper } = getWrapper({ groups: [{ id: '1', displayName: 'group' }] })
      expect(wrapper.find(selectors.groupDetails).text()).toContain('group')
      expect(wrapper.findComponent(SideBarNoSelection).exists()).toBeFalsy()
      expect(wrapper.find(selectors.multipleGroups).exists()).toBeFalsy()
    })
  })

  describe('multiple groups given', () => {
    it('renders the multiple selection info', () => {
      const { wrapper } = getWrapper({
        groups: [
          { id: '1', displayName: 'group1' },
          { id: '2', displayName: 'group2' }
        ]
      })
      expect(wrapper.find(selectors.multipleGroups).text()).toContain('2 groups selected')
      expect(wrapper.find(selectors.groupDetails).exists()).toBeFalsy()
      expect(wrapper.findComponent(SideBarNoSelection).exists()).toBeFalsy()
    })
  })
})

function getWrapper({ groups = [], groupsCount = 0 }: { groups?: Group[]; groupsCount?: number }) {
  return {
    wrapper: mount(DetailsPanel, {
      props: { groups, groupsCount },
      global: {
        stubs: {
          'avatar-image': true,
          'oc-icon': true,
          'inline-svg': true
        },
        plugins: [...defaultPlugins()]
      }
    })
  }
}
