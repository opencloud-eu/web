import General from '../../../src/views/General.vue'
import AnnouncementSection from '../../../src/components/General/AnnouncementSection.vue'
import { AbilityRule } from '@opencloud-eu/web-client'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'

describe('General view', () => {
  it('hides the announcement section without the Announcement permission', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.findComponent(AnnouncementSection).exists()).toBe(false)
  })

  it('shows the announcement section with the Announcement permission', () => {
    const { wrapper } = getWrapper([{ action: 'read-all', subject: 'Announcement' }])
    expect(wrapper.findComponent(AnnouncementSection).exists()).toBe(true)
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
