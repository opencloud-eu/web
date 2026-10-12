import { useLocalStorage, usePreferredDark } from '@vueuse/core'
import { ThemeConfigType, useThemeStore } from '../../../../src/composables/piniaStores'
import { mockDeep } from 'vitest-mock-extended'
import { createPinia, setActivePinia } from 'pinia'
import { computed, ref } from 'vue'

vi.mock('@vueuse/core', () => {
  return { useLocalStorage: vi.fn(() => ref('')), usePreferredDark: vi.fn(() => ref(false)) }
})

describe('useThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initializeThemes', () => {
    it('sets availableThemes', () => {
      const themeConfig = mockDeep<ThemeConfigType>()
      themeConfig.clients.web.themes = [
        { label: 'light', designTokens: {}, isDark: false },
        { label: 'dark', designTokens: {}, isDark: true }
      ]

      const store = useThemeStore()
      store.initializeThemes(themeConfig)

      expect(store.availableThemes.length).toBe(themeConfig.clients.web.themes.length)
    })
    describe('currentTheme', () => {
      it.each([true, false])('gets set based on the OS setting', (isDark) => {
        vi.mocked(usePreferredDark).mockReturnValue(computed(() => isDark))
        vi.mocked(useLocalStorage).mockReturnValue(ref<string>(null))

        const themeConfig = mockDeep<ThemeConfigType>()
        themeConfig.clients.web.themes = [
          { label: 'light', designTokens: {}, isDark: false },
          { label: 'dark', designTokens: {}, isDark: true }
        ]
        themeConfig.clients.web.defaults = {}

        const store = useThemeStore()
        store.initializeThemes(themeConfig)

        expect(store.currentTheme.label).toEqual(
          themeConfig.clients.web.themes.find((t) => t.isDark === isDark).label
        )
      })
      it('falls back to the first theme if no match for the OS setting is found', () => {
        vi.mocked(usePreferredDark).mockReturnValue(computed(() => true))
        vi.mocked(useLocalStorage).mockReturnValue(ref<string>(null))

        const themeConfig = mockDeep<ThemeConfigType>()
        themeConfig.clients.web.themes = [{ label: 'light', designTokens: {}, isDark: false }]
        themeConfig.clients.web.defaults = {}

        const store = useThemeStore()
        store.initializeThemes(themeConfig)

        expect(store.currentTheme.label).toEqual('light')
      })
    })
  })

  describe('setAndApplyTheme', () => {
    it('clears custom props the previous theme set but the next one does not define', () => {
      const store = useThemeStore()

      store.setAndApplyTheme({
        label: 'a',
        isDark: false,
        designTokens: { fontFamily: 'Comic Sans' }
      })
      expect(document.documentElement.style.getPropertyValue('--oc-font-family')).toBe('Comic Sans')

      store.setAndApplyTheme({ label: 'b', isDark: false, designTokens: {} })
      expect(document.documentElement.style.getPropertyValue('--oc-font-family')).toBe('')
    })

    it('sets the font size and clears it when the next theme does not define one', () => {
      const store = useThemeStore()

      store.setAndApplyTheme({ label: 'a', isDark: false, designTokens: { fontSize: '1rem' } })
      expect(document.documentElement.style.getPropertyValue('--oc-font-size')).toBe('1rem')

      store.setAndApplyTheme({ label: 'b', isDark: false, designTokens: {} })
      expect(document.documentElement.style.getPropertyValue('--oc-font-size')).toBe('')
    })

    it('does not throw when the theme has no design tokens', () => {
      const store = useThemeStore()

      expect(() => store.setAndApplyTheme({ label: 'a', isDark: false })).not.toThrow()
    })

    describe('font face', () => {
      const fonts = { add: vi.fn(), delete: vi.fn() }
      const load = vi.fn()

      beforeEach(() => {
        load.mockResolvedValue(undefined)
        vi.stubGlobal(
          'FontFace',
          vi.fn(function (family: string, source: string) {
            return { family, source, load }
          })
        )
        Object.defineProperty(document, 'fonts', { value: fonts, configurable: true })
      })

      afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        fonts.add.mockReset()
        fonts.delete.mockReset()
        load.mockReset()
      })

      it('registers the font under the first unquoted family name with a weight range', () => {
        const store = useThemeStore()
        store.setAndApplyTheme({
          label: 'a',
          isDark: false,
          designTokens: { fontFamily: '"My Font", sans-serif', fontSource: '/font.woff2' }
        })

        expect(FontFace).toHaveBeenCalledWith('My Font', "url('/font.woff2')", {
          display: 'swap',
          weight: '100 900'
        })
        expect(fonts.add).toHaveBeenCalledTimes(1)
      })

      it('removes the previous font when the next theme has no font source', () => {
        const store = useThemeStore()
        store.setAndApplyTheme({
          label: 'a',
          isDark: false,
          designTokens: { fontFamily: 'My Font', fontSource: '/font.woff2' }
        })
        const fontFace = fonts.add.mock.calls[0][0]

        store.setAndApplyTheme({
          label: 'b',
          isDark: false,
          designTokens: { fontFamily: 'My Font' }
        })

        expect(fonts.delete).toHaveBeenCalledWith(fontFace)
        expect(fonts.add).toHaveBeenCalledTimes(1)
      })

      it('keeps the font when the next theme uses the same font', () => {
        const store = useThemeStore()
        const designTokens = { fontFamily: 'My Font', fontSource: '/font.woff2' }
        store.setAndApplyTheme({ label: 'light', isDark: false, designTokens })
        store.setAndApplyTheme({ label: 'dark', isDark: true, designTokens })

        expect(fonts.add).toHaveBeenCalledTimes(1)
        expect(fonts.delete).not.toHaveBeenCalled()
      })

      it('warns and registers no font when the font source has no font family', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const store = useThemeStore()
        store.setAndApplyTheme({
          label: 'a',
          isDark: false,
          designTokens: { fontSource: '/font.woff2' }
        })

        expect(fonts.add).not.toHaveBeenCalled()
        expect(console.warn).toHaveBeenCalled()
      })

      it('warns when the font fails to load', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        load.mockRejectedValue(new Error('404'))
        const store = useThemeStore()
        store.setAndApplyTheme({
          label: 'a',
          isDark: false,
          designTokens: { fontFamily: 'My Font', fontSource: '/font.woff2' }
        })

        await vi.waitFor(() => expect(console.warn).toHaveBeenCalled())
      })
    })

    describe('font size', () => {
      afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        document.documentElement.style.removeProperty('--oc-font-size')
      })

      it('applies a valid font size', () => {
        const store = useThemeStore()
        store.setAndApplyTheme({ label: 'a', isDark: false, designTokens: { fontSize: '16px' } })

        expect(document.documentElement.style.getPropertyValue('--oc-font-size')).toBe('16px')
      })

      it('ignores an invalid font size', () => {
        vi.stubGlobal('CSS', { supports: vi.fn(() => false) })
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const store = useThemeStore()
        store.setAndApplyTheme({ label: 'a', isDark: false, designTokens: { fontSize: '16' } })

        expect(document.documentElement.style.getPropertyValue('--oc-font-size')).toBe('')
        expect(console.warn).toHaveBeenCalled()
      })
    })

    it('exposes the active theme label on the html element', () => {
      const store = useThemeStore()
      store.setAndApplyTheme({ label: 'my-theme', designTokens: {}, isDark: false })

      expect(document.documentElement.dataset.theme).toBe('my-theme')
    })
  })
})
