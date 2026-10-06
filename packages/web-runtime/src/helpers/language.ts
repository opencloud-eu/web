import { ApplicationInformation } from '@opencloud-eu/web-pkg'
import { merge } from 'lodash-es'
import { Language } from 'vue3-gettext'
import runtimeTranslations from 'virtual:l10n/web-runtime'
import clientTranslations from 'virtual:l10n/web-client'
import pkgTranslations from 'virtual:l10n/web-pkg'
import designSystemTranslations from 'virtual:l10n/design-system'

const coreTranslations = [
  runtimeTranslations,
  clientTranslations,
  pkgTranslations,
  designSystemTranslations
]

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

async function loadLanguage(translations: ApplicationInformation['translations'], lang: string) {
  const messages = translations?.[lang]
  return typeof messages === 'function' ? await messages() : messages
}

async function loadLanguages(
  translationsList: ApplicationInformation['translations'][],
  lang: string
) {
  const results = await Promise.allSettled(
    translationsList.map((translations) => loadLanguage(translations, lang))
  )

  return results.flatMap((result) => {
    if (result.status === 'rejected') {
      console.error(`Failed to load translations for language "${lang}"`, result.reason)
      return []
    }
    return [result.value]
  })
}

/** Starts loading the core translations early, so they are cached once `loadTranslations` needs them. */
export function preloadCoreTranslations(lang: string) {
  void Promise.allSettled(coreTranslations.map((translations) => loadLanguage(translations, lang)))
}

/**
 * Loads the core and app translations for one given language.
 * Translations already present in gettext (e.g. custom translations) take precedence.
 */
export const loadTranslations = async ({
  apps,
  gettext,
  lang
}: {
  apps: Record<string, ApplicationInformation>
  gettext: Language
  lang: string
}) => {
  // english falls back to the msgid
  if (lang === 'en') {
    return
  }

  const [core, app] = await Promise.all([
    loadLanguages(coreTranslations, lang),
    loadLanguages(
      Object.values(apps).map(({ translations }) => translations),
      lang
    )
  ])

  // unsupported language
  if (![...core, ...app].some(Boolean)) {
    return
  }

  gettext.translations = merge({}, { [lang]: merge({}, ...core, ...app) }, gettext.translations)
}

let latestLanguageRequest = 0

/**
 * Loads the translations of the given language and makes it the current one.
 * Resolves to false if a newer call superseded this one, in which case nothing has been applied.
 */
export const setCurrentLanguage = async ({
  language,
  languageSetting = null,
  apps = {}
}: {
  language: Language
  languageSetting?: string | null
  apps?: Record<string, ApplicationInformation>
}): Promise<boolean> => {
  const currentLanguage = normalizeLanguage(languageSetting || language.current)
  if (!currentLanguage) {
    return false
  }

  const request = ++latestLanguageRequest
  await loadTranslations({ apps, gettext: language, lang: currentLanguage })

  if (request !== latestLanguageRequest) {
    return false
  }

  language.current = currentLanguage
  setDocumentLanguage(currentLanguage)
  storeLanguage(currentLanguage)
  return true
}
