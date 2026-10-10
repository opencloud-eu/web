import SharesPanel from '../../../../../src/components/SideBar/Shares/SharesPanel.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { ref } from 'vue'

const ocLoaderStubSelector = 'oc-loader-stub'

describe('SharesPanel', () => {
  describe('when loading is set to true', () => {
    it('should show the oc loader', () => {
      const { wrapper } = getWrapper({ sharesLoading: true })

      expect(wrapper.find(ocLoaderStubSelector).exists()).toBeTruthy()
      expect(wrapper.find(ocLoaderStubSelector).attributes().arialabel).toBe(
        'Loading list of shares'
      )
    })
  })
  describe('when sharesLoading is set to false', () => {
    it('should not show the oc loader', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find('oc-loader-stub').exists()).toBeFalsy()
    })
  })

  describe('when the sidebar resource is not loaded yet', () => {
    it('should show the oc loader instead of the panels', () => {
      const { wrapper } = getWrapper({ resource: null, showSpaceMembers: true })
      expect(wrapper.find(ocLoaderStubSelector).exists()).toBeTruthy()
      expect(wrapper.find('space-members-stub').exists()).toBeFalsy()
    })
  })

  function getWrapper({ sharesLoading = false, resource = {}, showSpaceMembers = false } = {}) {
    return {
      wrapper: shallowMount(SharesPanel, {
        props: { showSpaceMembers },
        global: {
          plugins: [
            ...defaultPlugins({ piniaOptions: { sharesState: { loading: sharesLoading } } })
          ],
          provide: {
            displayedItem: {},
            displayedSpace: {},
            resource: ref(resource),
            spaceMembers: { value: [] }
          }
        }
      })
    }
  }
})
