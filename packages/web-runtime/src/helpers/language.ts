import { ApplicationInformation } from '@opencloud-eu/web-pkg'
import { merge } from 'lodash-es'
import { Language, Translations } from 'vue3-gettext'

export const currentLanguageLocalStorageKey = 'oc_language'

function normalizeLanguage(languageSetting: string): string {
  const trimmed = languageSetting.trim()
  if (!trimmed) {
    return ''
  }
  return trimmed.includes('-') ? trimmed.split('-')[0] : trimmed
}

function getStoredLanguage(): string {
  const storedLanguage = window.localStorage.getItem(currentLanguageLocalStorageKey) ?? ''
  if (!storedLanguage) {
    return ''
  }
  return normalizeLanguage(storedLanguage)
}

function storeLanguage(language: string): void {
  window.localStorage.setItem(currentLanguageLocalStorageKey, language)
}

function setDocumentLanguage(languageSetting: string): void {
  const currentLanguage = normalizeLanguage(languageSetting)
  if (!currentLanguage) {
    return
  }

  document.documentElement.lang = currentLanguage
}

export const resolveInitialLanguage = ({
  browserLanguage
}: {
  browserLanguage: string
}): string => {
  const stored = getStoredLanguage()
  const currentLanguage = stored || normalizeLanguage(browserLanguage) || 'en'

  setDocumentLanguage(currentLanguage)
  return currentLanguage
}

export const setCurrentLanguage = ({
  language,
  languageSetting = null
}: {
  language: Language
  languageSetting?: string | null
}): void => {
  const currentLanguage = normalizeLanguage(languageSetting || language.current)
  if (!currentLanguage) {
    return
  }

  language.current = currentLanguage
  setDocumentLanguage(currentLanguage)
  storeLanguage(currentLanguage)
}

/**
 * Loads all app translations for one given language.
 * This should be called each time the language is being changed.
 */
export const loadAppTranslations = ({
  apps,
  gettext,
  lang
}: {
  apps: Record<string, ApplicationInformation>
  gettext: Language
  lang: string
}) => {
  const appTranslations: Translations = {}
  Object.values(apps).forEach((app) => {
    const { translations } = app
    if (gettext.translations[lang] && translations?.[lang]) {
      Object.assign(appTranslations, translations[lang])
    }
  })

  gettext.translations = merge(gettext.translations, {
    [lang]: appTranslations
  })
}
