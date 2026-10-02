import { mock } from 'vitest-mock-extended'
import { nextTick } from 'vue'
import type { Language, Translations } from 'vue3-gettext'
import {
  currentLanguageLocalStorageKey,
  loadTranslations,
  resolveInitialLanguage,
  setCurrentLanguage
} from '../../../src/helpers/language'

function createGettext(translations: Translations = {}) {
  return { translations } as unknown as Language
}

describe('language helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.lang = ''
  })

  it('prefers stored language over browser language', () => {
    window.localStorage.setItem(currentLanguageLocalStorageKey, 'en')

    const lang = resolveInitialLanguage({
      browserLanguage: 'de-DE'
    })

    expect(lang).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('falls back to browser language when no stored language exists', () => {
    const lang = resolveInitialLanguage({
      browserLanguage: 'de-DE'
    })

    expect(lang).toBe('de')
    expect(document.documentElement.lang).toBe('de')
  })

  it('falls back to english when browser language is missing', () => {
    const lang = resolveInitialLanguage({
      browserLanguage: ''
    })

    expect(lang).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('sets, normalizes and stores the selected language', async () => {
    const language = mock<Language>({ current: 'de', translations: {} })

    await setCurrentLanguage({
      language,
      languageSetting: 'en-US'
    })
    await nextTick()

    expect(language.current).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(window.localStorage.getItem(currentLanguageLocalStorageKey)).toBe('en')
  })

  it('sets and stores current language when language setting is not provided', async () => {
    const language = mock<Language>({ current: 'fr-FR', translations: {} })

    await setCurrentLanguage({
      language
    })
    await nextTick()

    expect(language.current).toBe('fr')
    expect(language.translations.fr).toBeDefined()
    expect(document.documentElement.lang).toBe('fr')
    expect(window.localStorage.getItem(currentLanguageLocalStorageKey)).toBe('fr')
  })

  it('applies the language even if a translation loader fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const language = mock<Language>({ current: 'en', translations: {} })

    const applied = await setCurrentLanguage({
      language,
      languageSetting: 'de',
      apps: { broken: { translations: { de: vi.fn().mockRejectedValue(new Error()) } } }
    })

    expect(applied).toBe(true)
    expect(language.current).toBe('de')
    expect(Object.keys(language.translations.de).length).toBeGreaterThan(0)
  })

  it('only applies the latest requested language', async () => {
    const language = mock<Language>({ current: 'en', translations: {} })
    let resolveDe: (messages: Record<string, string>) => void
    const apps = {
      app: {
        translations: {
          de: () => new Promise<Record<string, string>>((resolve) => (resolveDe = resolve)),
          fr: () => Promise.resolve({})
        }
      }
    }

    const de = setCurrentLanguage({ language, languageSetting: 'de', apps })
    const fr = setCurrentLanguage({ language, languageSetting: 'fr', apps })

    expect(await fr).toBe(true)
    resolveDe({})
    expect(await de).toBe(false)

    expect(language.current).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
    expect(window.localStorage.getItem(currentLanguageLocalStorageKey)).toBe('fr')
  })

  describe('loadTranslations', () => {
    it('loads core translations only for the given language', async () => {
      const gettext = createGettext()

      await loadTranslations({ apps: {}, gettext, lang: 'de' })

      expect(Object.keys(gettext.translations)).toEqual(['de'])
      expect(Object.keys(gettext.translations.de).length).toBeGreaterThan(0)
    })

    it('loads the remaining translations if a loader fails', async () => {
      const gettext = createGettext()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      await loadTranslations({
        apps: {
          broken: { translations: { de: vi.fn().mockRejectedValue(new Error('chunk failed')) } },
          working: { translations: { de: vi.fn().mockResolvedValue({ loaded: 'geladen' }) } }
        },
        gettext,
        lang: 'de'
      })

      expect(consoleSpy).toHaveBeenCalled()
      expect(gettext.translations.de.loaded).toBe('geladen')
      expect(Object.keys(gettext.translations.de).length).toBeGreaterThan(1)
    })

    it('does not add translations for unsupported languages', async () => {
      const gettext = createGettext()

      await loadTranslations({ apps: {}, gettext, lang: 'xx' })

      expect(gettext.translations).toEqual({})
    })

    it('adds app translations for languages without core translations', async () => {
      const gettext = createGettext()

      await loadTranslations({
        apps: { app: { translations: { xx: { Delete: 'Xx-Delete' } } } },
        gettext,
        lang: 'xx'
      })

      expect(gettext.translations).toEqual({ xx: { Delete: 'Xx-Delete' } })
    })

    it('loads app translations from plain objects and loaders', async () => {
      const gettext = createGettext()
      const loader = vi.fn().mockResolvedValue({ loaded: 'geladen' })

      await loadTranslations({
        apps: {
          plain: { translations: { de: { plain: 'einfach' }, fr: { plain: 'simple' } } },
          lazy: { translations: { de: loader } }
        },
        gettext,
        lang: 'de'
      })

      expect(loader).toHaveBeenCalledOnce()
      expect(gettext.translations.de.plain).toBe('einfach')
      expect(gettext.translations.de.loaded).toBe('geladen')
      expect(gettext.translations.fr).toBeUndefined()
    })

    it('keeps existing translations with precedence', async () => {
      const gettext = createGettext({ de: { Delete: 'Custom' } })

      await loadTranslations({ apps: {}, gettext, lang: 'de' })

      expect(gettext.translations.de.Delete).toBe('Custom')
    })

    it('does not add translations for english', async () => {
      const gettext = createGettext()

      await loadTranslations({
        apps: { app: { translations: { en: { Delete: 'Remove' } } } },
        gettext,
        lang: 'en'
      })

      expect(gettext.translations).toEqual({})
    })
  })
})
