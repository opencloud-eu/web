import { mock } from 'vitest-mock-extended'
import { nextTick } from 'vue'
import type { Language } from 'vue3-gettext'
import {
  currentLanguageLocalStorageKey,
  resolveInitialLanguage,
  setCurrentLanguage
} from '../../../src/helpers/language'

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
    const language = mock<Language>({ current: 'de' })

    setCurrentLanguage({
      language,
      languageSetting: 'en-US'
    })
    await nextTick()

    expect(language.current).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(window.localStorage.getItem(currentLanguageLocalStorageKey)).toBe('en')
  })

  it('sets and stores current language when language setting is not provided', async () => {
    const language = mock<Language>({ current: 'fr-FR' })

    setCurrentLanguage({
      language
    })
    await nextTick()

    expect(language.current).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
    expect(window.localStorage.getItem(currentLanguageLocalStorageKey)).toBe('fr')
  })
})
