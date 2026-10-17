import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

const html = readFileSync(resolve(import.meta.dirname, '../../index.html'), 'utf8')
const initialThemeScript = html.match(/<script>([\s\S]*?)<\/script>/)[1]

describe('initial theme background', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('style')
    delete document.documentElement.dataset.colorScheme
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('style')
    delete document.documentElement.dataset.colorScheme
  })

  it.each([
    { name: null, cachedDark: null, systemDark: false, expectedDark: false },
    { name: null, cachedDark: null, systemDark: true, expectedDark: true },
    { name: null, cachedDark: 'true', systemDark: false, expectedDark: false },
    { name: null, cachedDark: 'false', systemDark: true, expectedDark: true },
    { name: 'dark', cachedDark: 'true', systemDark: false, expectedDark: true },
    { name: 'light', cachedDark: 'false', systemDark: true, expectedDark: false },
    { name: 'custom', cachedDark: null, systemDark: true, expectedDark: true }
  ])(
    'uses the correct background for $name with cached dark=$cachedDark and system dark=$systemDark',
    ({ name, cachedDark, systemDark, expectedDark }) => {
      if (name !== null) {
        localStorage.setItem('oc_currentThemeName', name)
      }
      if (cachedDark !== null) {
        localStorage.setItem('oc_currentThemeIsDark', cachedDark)
      }

      runInNewContext(initialThemeScript, {
        document,
        localStorage,
        window: { matchMedia: () => ({ matches: systemDark }) }
      })

      expect(document.documentElement.style.colorScheme).toBe(expectedDark ? 'dark' : 'light')
      expect(document.documentElement.dataset.colorScheme).toBe(expectedDark ? 'dark' : 'light')
      expect(document.documentElement.style.backgroundColor).toBe(
        expectedDark ? '#1d2021' : '#f6f8fa'
      )
    }
  )

  it('uses the system preference when storage is unavailable', () => {
    runInNewContext(initialThemeScript, {
      document,
      localStorage: {
        getItem() {
          throw new Error('Storage is unavailable')
        }
      },
      window: { matchMedia: () => ({ matches: true }) }
    })

    expect(document.documentElement.dataset.colorScheme).toBe('dark')
  })

  it('falls back to light when matchMedia is unavailable', () => {
    runInNewContext(initialThemeScript, { document, localStorage, window: {} })

    expect(document.documentElement.dataset.colorScheme).toBe('light')
  })
})
