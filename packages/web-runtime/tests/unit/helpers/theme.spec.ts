import { loadTheme } from '../../../src/helpers/theme'
import { ThemeConfigType } from '@opencloud-eu/web-pkg'
import { mock, mockDeep } from 'vitest-mock-extended'

const themeConfig = mockDeep<ThemeConfigType>({
  clients: {
    web: {
      themes: [
        { label: 'Light theme', isDark: false, designTokens: { fontFamily: 'OpenCloud' } },
        { label: 'Dark theme', isDark: true, designTokens: { fontFamily: 'OpenCloud' } }
      ]
    }
  }
})

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    ThemeConfig: {
      parse: vi.fn((arg) => arg),
      safeParse: (arg: unknown) => actual.ThemeConfig.safeParse(arg)
    }
  }
})

vi.spyOn(console, 'error').mockImplementation(() => undefined)

describe('theme loading and error reporting', () => {
  it('should load a theme', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      mock<Response>({
        status: 200,
        json: () => Promise.resolve(themeConfig)
      })
    )

    const theme1 = await loadTheme('http://www.opencloud.eu/custom.json')
    expect(theme1).toMatchObject(themeConfig)
  })
  it('should swallow the theme if a network error happens', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      mock<Response>({
        status: 404,
        ok: false
      })
    )
    const consoleSpy = vi.spyOn(console, 'error')
    await loadTheme('nono')
    expect(consoleSpy).toHaveBeenCalled()
  })
})
