import { App } from 'vue'
import { createGettext } from 'vue3-gettext'
import { applyCustomProp, setIconUrlPrefix, InstallOptions } from './helpers'
import translations from '../l10n/translations.json'
import kebabCase from 'lodash-es/kebabCase'

import * as components from './components'
import * as directives from './directives'

// fonts must be imported here to ensure they are included in the build
import './styles/fonts.scss'
import './styles/layers.css'
import 'tippy.js/dist/tippy.css'

let gettextInstance: ReturnType<typeof createGettext> | null = null

const initializeCustomProps = (tokens: Record<string, string>, prefix: string) => {
  for (const param in tokens) {
    applyCustomProp(prefix + kebabCase(param), tokens[param])
  }
}

export function setLanguage(lang: string) {
  if (gettextInstance) {
    gettextInstance.current = lang
  } else {
    console.error('vue3-gettext is not initialized. Please make sure to initialize it properly.')
  }
}

export default {
  install(app: App, options: InstallOptions = {}) {
    setIconUrlPrefix(options.iconUrlPrefix || '')

    if (options?.language?.initGettext) {
      gettextInstance = createGettext({
        defaultLanguage: options.language.defaultLanguage || 'en',
        silent: true,
        translations: {
          ...translations,
          ...(options.language.translations || {})
        }
      })
      app.use(gettextInstance)
    }

    const themeOptions = options.tokens
    initializeCustomProps(themeOptions?.colorPalette, 'color-')
    initializeCustomProps(themeOptions?.roles, 'role-')
    applyCustomProp('font-family', themeOptions?.fontFamily)
    if (!themeOptions?.roles?.chrome) {
      // fallback to surfaceContainer if chrome is not defined since it may not be set
      applyCustomProp('role-chrome', themeOptions?.roles?.surfaceContainer)
      applyCustomProp('role-on-chrome', themeOptions?.roles?.onSurface)
    }

    Object.values(components).forEach((c) => app.component(c.__name, c))
    Object.values(directives).forEach((d) => app.directive(d.name, d))
  }
}
