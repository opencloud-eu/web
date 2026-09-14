import General from '../../../src/views/General.vue'
import { AbilityRule } from '@opencloud-eu/web-client'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'

vi.mock('../../../src/components/General/AnnouncementSection.vue', () => ({
  default: { name: 'AnnouncementSection', template: '<div />' }
}))

describe('General view', () => {
  it('hides the announcement section without the Announcement permission', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('announcement-section-stub').exists()).toBe(false)
  })

  it('shows the announcement section with the Announcement permission', () => {
    const { wrapper } = getWrapper([{ action: 'read-all', subject: 'Announcement' }])
    expect(wrapper.find('announcement-section-stub').exists()).toBe(true)
  })
})

function getWrapper(abilities: AbilityRule[] = []) {
  return {
    wrapper: shallowMount(General, {
      global: {
        plugins: [...defaultPlugins({ abilities })],
        // render the mainContent slot so the gated sections end up in the tree
        stubs: { AppTemplate: { template: '<div><slot name="mainContent" /></div>' } }
      }
    })
  }
}
