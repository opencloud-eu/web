import { ConfigStore } from '@opencloud-eu/web-pkg'
import merge from 'lodash-es/merge'
import { Translations } from 'vue3-gettext'

export const loadCustomTranslations = async ({
  configStore
}: {
  configStore: ConfigStore
}): Promise<Translations> => {
  const customTranslations = {}
  for (const customTranslation of configStore.customTranslations) {
    const customTranslationResponse = await fetch(customTranslation.url, {
      headers: { 'X-Request-ID': crypto.randomUUID() }
    })
    if (customTranslationResponse.status !== 200) {
      console.error(
        `translation file ${customTranslation} could not be loaded. HTTP status-code ${customTranslationResponse.status}`
      )
      continue
    }
    try {
      const customTranslationJSON = await customTranslationResponse.json()
      merge(customTranslations, customTranslationJSON)
    } catch (e) {
      console.error(`translation file ${customTranslation} could not be parsed. ${e}`)
    }
  }
  return customTranslations
}
