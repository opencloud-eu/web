import SupportCard from '../../../../src/components/SidebarNav/SupportCard.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { createGettext } from 'vue3-gettext'
import { flushPromises } from '@vue/test-utils'

describe('SupportCard', () => {
  it('shows a single support button that toggles the drop', async () => {
    const { wrapper } = getWrapper()
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].text()).toBe('Support us')
    expect(buttons[0].attributes('aria-haspopup')).toBe('true')
    expect(buttons[0].attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.oc-drop').exists()).toBeFalsy()

    await openDrop(wrapper)
    expect(buttons[0].attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.oc-drop').exists()).toBeTruthy()
    wrapper.unmount()
  })

  it('links the donate entry to the GitHub sponsors page', async () => {
    const { wrapper } = getWrapper()
    await openDrop(wrapper)
    const donateLink = wrapper.find('.oc-drop a.oc-support-card-donate')
    expect(donateLink.text()).toBe('Donate')
    expect(donateLink.attributes('href')).toBe('https://github.com/sponsors/opencloud-eu')
    expect(donateLink.attributes('target')).toBe('_blank')
    expect(donateLink.attributes('rel')).toBe('noopener noreferrer')
    wrapper.unmount()
  })

  it.each([
    { language: 'de', expected: 'de/node/2256' },
    { language: 'de_CH', expected: 'de/node/2256' },
    { language: 'en', expected: 'en/node/2256' },
    { language: 'fr', expected: 'en/node/2256' }
  ])(
    'links the buy support entry to $expected for language $language',
    async ({ language, expected }) => {
      const { wrapper } = getWrapper({ language })
      await openDrop(wrapper)
      const buySupportLink = wrapper.find('.oc-drop a.oc-support-card-buy-support')
      expect(buySupportLink.text()).toBe('Buy support')
      expect(buySupportLink.attributes('href')).toBe(
        `https://opencloud.eu/${expected}?mtm_campaign=subscription_support&mtm_source=opencloud_web&mtm_medium=in_app&mtm_content=buy_button`
      )
      expect(buySupportLink.attributes('target')).toBe('_blank')
      expect(buySupportLink.attributes('rel')).toBe('noopener noreferrer')
      wrapper.unmount()
    }
  )

  it('only animates on the first mount', async () => {
    vi.resetModules()
    const { default: FreshSupportCard } =
      await import('../../../../src/components/SidebarNav/SupportCard.vue')
    const { wrapper: firstWrapper } = getWrapper({ component: FreshSupportCard })
    const { wrapper: secondWrapper } = getWrapper({ component: FreshSupportCard })
    expect(firstWrapper.find('.oc-support-card-animated').exists()).toBeTruthy()
    expect(secondWrapper.find('.oc-support-card-animated').exists()).toBeFalsy()
    firstWrapper.unmount()
    secondWrapper.unmount()
  })
})

async function openDrop(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  await wrapper.find('.oc-support-card-toggle').trigger('click')
  await vi.waitFor(() => {
    expect(wrapper.find('.oc-drop a').exists()).toBeTruthy()
  })
  await flushPromises()
}

function getWrapper({ language = 'en', component = SupportCard } = {}) {
  return {
    wrapper: mount(component, {
      attachTo: document.body,
      global: {
        plugins: [
          ...defaultPlugins({ gettext: false }),
          createGettext({ translations: {}, silent: true, defaultLanguage: language })
        ]
      }
    })
  }
}
