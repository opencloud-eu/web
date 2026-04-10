import merge from 'lodash-es/merge'
import App from '../App.vue'
import missingOrInvalidConfigPage from '../pages/missingOrInvalidConfig.vue'

export * from './languages'

export const pages = {
  success: App,
  failure: missingOrInvalidConfigPage
}

export const loadTranslations = async () => {
  const { coreTranslations, clientTranslations, pkgTranslations, odsTranslations } =
    await import('./json')

  return merge({}, coreTranslations, clientTranslations, pkgTranslations, odsTranslations)
}

export const loadDesignSystem = async () => {
  return (await import('@opencloud-eu/design-system')).default
}
