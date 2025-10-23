import { useThemeStore, ThemeConfigType } from '@opencloud-eu/web-pkg'
import { mockDeep } from 'vitest-mock-extended'
import ThemeSwitcher from '../../../../src/components/Account/ThemeSwitcher.vue'
import { defaultPlugins, defaultStubs, mount } from '@opencloud-eu/web-test-helpers'

const themeConfig = mockDeep<ThemeConfigType>({
  clients: {
    web: {
      themes: [
        { label: 'Light theme', isDark: false, designTokens: { fontFamily: 'OpenCloud' } },
        { label: 'Dark theme', isDark: true, designTokens: { fontFamily: 'OpenCloud' } }
      ]
    }
  }
})

describe('ThemeSwitcher component', () => {
  describe('restores', () => {
    it('light theme if light theme is saved in localstorage', async () => {
      const { wrapper } = getWrapper({ hasOnlyOneTheme: false })
      const themeStore = useThemeStore()
      window.localStorage.setItem('oc_currentThemeName', 'Light Theme')
      themeStore.initializeThemes(themeConfig)
      await wrapper.vm.$nextTick()
      expect(wrapper.html()).toMatchSnapshot()
    })
    it('dark theme if dark theme is saved in localstorage', async () => {
      const { wrapper } = getWrapper()
      const themeStore = useThemeStore()
      window.localStorage.setItem('oc_currentThemeName', 'Dark Theme')
      themeStore.initializeThemes(themeConfig)
      await wrapper.vm.$nextTick()
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
})

function getWrapper({ hasOnlyOneTheme = false } = {}) {
  const availableThemes = hasOnlyOneTheme
    ? [themeConfig.clients.web.themes[0]]
    : themeConfig.clients.web.themes

  return {
    wrapper: mount(ThemeSwitcher, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              stubActions: false,
              themeState: {
                availableThemes,
                currentTheme: {
                  ...themeConfig.clients.web.defaults,
                  ...themeConfig.clients.web.themes[0]
                }
              }
            }
          })
        ],
        stubs: { ...defaultStubs, 'oc-icon': true }
      }
    })
  }
}
