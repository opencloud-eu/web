import App from '../App.vue'
import missingOrInvalidConfigPage from '../pages/missingOrInvalidConfig.vue'

export * from './languages'

export const pages = {
  success: App,
  failure: missingOrInvalidConfigPage
}

export const loadDesignSystem = async () => {
  return (await import('@opencloud-eu/design-system')).default
}
