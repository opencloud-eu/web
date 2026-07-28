import { nextTick } from 'vue'
import Announcement from '../../../src/components/Announcement.vue'
import { useConfigStore, useModals } from '@opencloud-eu/web-pkg'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'

describe('Announcement component', () => {
  it('renders the banner with the banner text', () => {
    const { wrapper } = getWrapper({ bannerText: 'Maintenance tonight' })
    expect(wrapper.find('.announcement').exists()).toBe(true)
    expect(wrapper.find('.announcement').text()).toContain('Maintenance tonight')
  })

  it('does not render when no announcement is set', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('.announcement').exists()).toBe(false)
  })

  it('does not render when the banner text is empty', () => {
    const { wrapper } = getWrapper({ bannerText: '' })
    expect(wrapper.find('.announcement').exists()).toBe(false)
  })

  it('hides the banner when dismissed', async () => {
    const { wrapper } = getWrapper({ bannerText: 'Maintenance tonight' })
    expect(wrapper.find('.announcement').exists()).toBe(true)

    await wrapper.find('oc-button-stub').trigger('click')

    expect(wrapper.find('.announcement').exists()).toBe(false)
  })

  it('opens the info dialog when info text is present', async () => {
    const { wrapper } = getWrapper({ bannerText: 'Maintenance', infoText: '# Details' })
    const { dispatchModal } = useModals()

    await wrapper.find('button').trigger('click')

    expect(dispatchModal).toHaveBeenCalled()
  })

  it('is not clickable when no info text is present', () => {
    const { wrapper } = getWrapper({ bannerText: 'Maintenance' })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('shows again when the announcement changes after being dismissed', async () => {
    const { wrapper } = getWrapper({ bannerText: 'First' })
    expect(wrapper.find('.announcement').exists()).toBe(true)

    await wrapper.find('oc-button-stub').trigger('click')
    expect(wrapper.find('.announcement').exists()).toBe(false)

    // a fresh preview / changed announcement arrives
    useConfigStore().options.announcement = { bannerText: 'Second' }
    await nextTick()

    expect(wrapper.find('.announcement').exists()).toBe(true)
    expect(wrapper.find('.announcement').text()).toContain('Second')
  })
})

function getWrapper(announcement?: { bannerText?: string; infoText?: string }) {
  return {
    wrapper: shallowMount(Announcement, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              configState: { options: announcement ? { announcement } : {} }
            }
          })
        ]
      }
    })
  }
}
