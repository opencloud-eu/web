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
    { cachedDark: null, systemDark: false, expectedDark: false },
    { cachedDark: null, systemDark: true, expectedDark: true },
    { cachedDark: 'true', systemDark: false, expectedDark: true },
    { cachedDark: 'false', systemDark: true, expectedDark: false }
  ])(
    'uses the correct background with cached dark=$cachedDark and system dark=$systemDark',
    ({ cachedDark, systemDark, expectedDark }) => {
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
