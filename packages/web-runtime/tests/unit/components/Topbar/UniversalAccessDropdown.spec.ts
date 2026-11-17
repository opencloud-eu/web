import UniversalAccessDropdown from '../../../../src/components/Topbar/UniversalAccessDropdown.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { WebThemeType } from '@opencloud-eu/web-pkg'

const easyLanguageUrl = 'https://easy-language.url'
const signLanguageUrl = 'https://sign-language.url'

describe('UniversalAccessDropdown component', () => {
  it('renders both entries if both urls are set', () => {
    const { wrapper } = getWrapper({ easyLanguage: easyLanguageUrl, signLanguage: signLanguageUrl })
    expect(wrapper.find('.universal-access-easy-language').exists()).toBeTruthy()
    expect(wrapper.find('.universal-access-sign-language').exists()).toBeTruthy()
  })
  it('renders only the easy language entry if only its url is set', () => {
    const { wrapper } = getWrapper({ easyLanguage: easyLanguageUrl })
    expect(wrapper.find('.universal-access-easy-language').exists()).toBeTruthy()
    expect(wrapper.find('.universal-access-sign-language').exists()).toBeFalsy()
  })
  it('renders only the sign language entry if only its url is set', () => {
    const { wrapper } = getWrapper({ signLanguage: signLanguageUrl })
    expect(wrapper.find('.universal-access-easy-language').exists()).toBeFalsy()
    expect(wrapper.find('.universal-access-sign-language').exists()).toBeTruthy()
  })
  it.each([
    { selector: '.universal-access-easy-language', href: easyLanguageUrl },
    { selector: '.universal-access-sign-language', href: signLanguageUrl }
  ])('links $selector to its url in a new tab', ({ selector, href }) => {
    const { wrapper } = getWrapper({ easyLanguage: easyLanguageUrl, signLanguage: signLanguageUrl })
    const link = wrapper.find(`${selector} oc-button-stub`)
    expect(link.attributes('type')).toBe('a')
    expect(link.attributes('href')).toBe(href)
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })
})

function getWrapper(urls: WebThemeType['urls'] = {}) {
  return {
    wrapper: shallowMount(UniversalAccessDropdown, {
      global: {
        renderStubDefaultSlot: true,
        plugins: [
          ...defaultPlugins({
            piniaOptions: { themeState: { currentTheme: { urls } as WebThemeType } }
          })
        ]
      }
    })
  }
}
