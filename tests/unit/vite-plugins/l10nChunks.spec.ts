import { l10nChunkGroups, l10nChunks } from '../../../dev/vite-plugins/l10nChunks.ts'
import runtimeTranslations from '../../../packages/web-runtime/l10n/translations.json'

const emptyLanguages = Object.entries(runtimeTranslations as Record<string, object>)
  .filter(([, messages]) => !Object.keys(messages).length)
  .map(([lang]) => lang)

function load(id: string) {
  const { load } = l10nChunks() as { load: (id: string) => string | undefined }
  return load.call({ addWatchFile: vi.fn() }, `\0${id}`)
}

describe('l10nChunks', () => {
  it('generates a loader map without english and empty languages', () => {
    const code = load('virtual:l10n/web-runtime')

    expect(code).toContain(`"de": () => import("virtual:l10n/web-runtime/de")`)
    expect(code).not.toContain('"en"')
    for (const lang of emptyLanguages) {
      expect(code).not.toContain(`"${lang}"`)
    }
  })

  it('generates the messages of one language', () => {
    const code = load('virtual:l10n/web-runtime/de')

    expect(JSON.parse(code.replace('export default ', ''))).toEqual(runtimeTranslations.de)
  })

  it('generates empty messages for an unknown language', () => {
    expect(load('virtual:l10n/web-runtime/xx')).toBe('export default {}')
  })

  it('throws for a package without translations', () => {
    expect(() => load('virtual:l10n/does-not-exist')).toThrow('No translations found')
  })

  it('ignores non-l10n modules', () => {
    expect(load('virtual:other')).toBeUndefined()
  })

  it('creates one chunk group per non-empty language', () => {
    const names = l10nChunkGroups().map(({ name }) => name)

    expect(names).toContain('l10n-de')
    expect(names).not.toContain('l10n-en')
    expect(new Set(names).size).toBe(names.length)
  })
})
