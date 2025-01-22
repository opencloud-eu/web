import DetailsPanel from '../../../../../src/components/Groups/SideBar/DetailsPanel.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'

describe('DetailsPanel', () => {
  describe('computed method "group"', () => {
    it('should be set if only one group is given', () => {
      const { wrapper } = getWrapper({
        propsData: { groups: [{ displayName: 'group', members: [] }] }
      })
      expect(wrapper.vm.group).toEqual({ displayName: 'group', members: [] })
    })
    it('should not be set if no groups are given', () => {
      const { wrapper } = getWrapper({
        propsData: { groups: [] }
      })
      expect(wrapper.vm.group).toEqual(null)
    })
    it('should not be set if multiple groups are given', () => {
      const { wrapper } = getWrapper({
        propsData: {
          groups: [
            { displayName: 'group1', members: [] },
            { displayName: 'group2', members: [] }
          ]
        }
      })
      expect(wrapper.vm.group).toEqual(null)
    })
  })

  describe('computed method "noGroups"', () => {
    it('should be true if no groups are given', () => {
      const { wrapper } = getWrapper({
        propsData: { groups: [] }
      })
      expect(wrapper.vm.noGroups).toBeTruthy()
    })
    it('should be false if groups are given', () => {
      const { wrapper } = getWrapper({
        propsData: { groups: [{ displayName: 'group', members: [] }] }
      })
      expect(wrapper.vm.noGroups).toBeFalsy()
    })
  })

  describe('computed method "multipleGroups"', () => {
    it('should be false if no groups are given', () => {
      const { wrapper } = getWrapper({ propsData: { groups: [] } })
      expect(wrapper.vm.multipleGroups).toBeFalsy()
    })
    it('should be false if one group is given', () => {
      const { wrapper } = getWrapper({
        propsData: { groups: [{ displayName: 'group', members: [] }] }
      })
      expect(wrapper.vm.multipleGroups).toBeFalsy()
    })
    it('should be true if multiple groups are given', () => {
      const { wrapper } = getWrapper({
        propsData: { groups: [{ displayName: 'group1' }, { displayName: 'group2', members: [] }] }
      })
      expect(wrapper.vm.multipleGroups).toBeTruthy()
    })
  })
})

function getWrapper({ propsData = {} } = {}) {
  return {
    wrapper: mount(DetailsPanel, {
      props: {
        groups: [],
        ...propsData
      },
      global: {
        stubs: {
          'avatar-image': true,
          'oc-icon': true
        },
        plugins: [...defaultPlugins()]
      }
    })
  }
}
