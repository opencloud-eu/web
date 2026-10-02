// Vite plugin: serves the translations.json of a package split by language, so only the
// current language needs to be loaded.
//
//   virtual:l10n/<pkg>         -> { de: () => import('virtual:l10n/<pkg>/de'), ... }
//   virtual:l10n/<pkg>/<lang>  -> the messages of one language
//
// English has no chunk because gettext falls back to the msgid.

import type { Plugin } from 'vite'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const packagesDir = join(import.meta.dirname, '..', '..', 'packages')
const prefix = 'virtual:l10n/'

function translationsFile(pkg: string) {
  return join(packagesDir, pkg, 'l10n', 'translations.json')
}

// parsed once per file version, every language module of a package reads the same file
const cache = new Map<string, { mtimeMs: number; translations: Record<string, object> }>()

function readTranslations(pkg: string): Record<string, object> {
  const file = translationsFile(pkg)
  if (!existsSync(file)) {
    throw new Error(`No translations found for package "${pkg}" at ${file}`)
  }

  const { mtimeMs } = statSync(file)
  const cached = cache.get(file)
  if (cached?.mtimeMs === mtimeMs) {
    return cached.translations
  }

  const translations = JSON.parse(readFileSync(file, 'utf-8'))
  cache.set(file, { mtimeMs, translations })
  return translations
}

function languagesOf(translations: Record<string, object>) {
  return Object.keys(translations).filter(
    (lang) => lang !== 'en' && Object.keys(translations[lang]).length
  )
}

/** One code splitting group per language, bundling the slices of all packages into one chunk */
export function l10nChunkGroups() {
  const languages = new Set(
    readdirSync(packagesDir)
      .filter((pkg) => existsSync(translationsFile(pkg)))
      .flatMap((pkg) => languagesOf(readTranslations(pkg)))
  )

  return [...languages].sort().map((lang) => ({
    name: `l10n-${lang}`,
    test: new RegExp(`${prefix}[^/]+/${lang}$`)
  }))
}

/** Resolves the virtual l10n modules and generates their code from the package's translations.json. */
export function l10nChunks(): Plugin {
  return {
    name: 'l10n-chunks',
    resolveId(id) {
      if (id.startsWith(prefix)) {
        return `\0${id}`
      }
    },
    load(id) {
      if (!id.startsWith(`\0${prefix}`)) {
        return
      }

      const [pkg, lang] = id.slice(prefix.length + 1).split('/')
      this.addWatchFile(translationsFile(pkg))

      if (lang) {
        return `export default ${JSON.stringify(readTranslations(pkg)[lang] || {})}`
      }

      const loaders = languagesOf(readTranslations(pkg)).map(
        (lang) =>
          `${JSON.stringify(lang)}: () => import(${JSON.stringify(`${prefix}${pkg}/${lang}`)}).then((m) => m.default)`
      )
      return `export default {\n${loaders.join(',\n')}\n}`
    }
  }
}

/**
 * Empties the design-system's translations.json which is statically imported for its lib consumers.
 * Web doesn't need it because it loads the design-system translations per language via the virtual modules.
 */
export function stubDesignSystemTranslations(): Plugin {
  const file = translationsFile('design-system')
  return {
    name: 'stub-design-system-translations',
    enforce: 'pre',
    load(id) {
      if (id === file) {
        return '{}'
      }
    }
  }
}
