import SupportCard from '../../../../src/components/SidebarNav/SupportCard.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { createGettext } from 'vue3-gettext'

describe('SupportCard', () => {
  it('links the donate button to the GitHub sponsors page', () => {
    const { wrapper } = getWrapper()
    const donateButton = wrapper.find('.oc-support-card-donate')
    expect(donateButton.attributes('href')).toBe('https://github.com/sponsors/opencloud-eu')
    expect(donateButton.attributes('target')).toBe('_blank')
    expect(donateButton.attributes('rel')).toBe('noopener noreferrer')
  })

  it.each([
    { language: 'de', expected: 'de/Subskription-support' },
    { language: 'de_CH', expected: 'de/Subskription-support' },
    { language: 'en', expected: 'en/subscription-support' },
    { language: 'fr', expected: 'en/subscription-support' }
  ])(
    'links the buy support button to $expected for language $language',
    ({ language, expected }) => {
      const { wrapper } = getWrapper({ language })
      const buySupportButton = wrapper.find('.oc-support-card-buy-support')
      expect(buySupportButton.attributes('href')).toBe(
        `https://opencloud.eu/${expected}?mtm_campaign=subscription_support&mtm_source=opencloud_website&mtm_medium=website&mtm_content=buy_button`
      )
      expect(buySupportButton.attributes('target')).toBe('_blank')
      expect(buySupportButton.attributes('rel')).toBe('noopener noreferrer')
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
  })
})

function getWrapper({ language = 'en', component = SupportCard } = {}) {
  return {
    wrapper: mount(component, {
      global: {
        plugins: [
          ...defaultPlugins({ gettext: false }),
          createGettext({ translations: {}, silent: true, defaultLanguage: language })
        ]
      }
    })
  }
}
