import { loadTheme } from '../../../src/helpers/theme'
import merge from 'lodash-es/merge'
import { ThemingConfigType } from '@opencloud-eu/web-pkg'
import { mock, mockDeep } from 'vitest-mock-extended'

const themeConfig = mockDeep<ThemingConfigType>({
  clients: {
    web: {
      themes: [
        { name: 'Light theme', isDark: false, designTokens: { fontFamily: 'OpenCloud' } },
        { name: 'Dark theme', isDark: true, designTokens: { fontFamily: 'OpenCloud' } }
      ]
    }
  }
})

const theme = {
  defaults: {
    ...themeConfig.clients.web.defaults,
    common: themeConfig.common
  },
  themes: themeConfig.clients.web.themes
}

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    ThemingConfig: {
      parse: vi.fn((arg) => arg),
      safeParse: (arg: unknown) => actual.ThemingConfig.safeParse(arg)
    }
  }
})

vi.spyOn(console, 'error').mockImplementation(() => undefined)

describe('theme loading and error reporting', () => {
  it('should load the custom theme if a custom location is given', async () => {
    const customTheme = merge({}, theme, {
      defaults: { logo: { login: 'custom.svg' } }
    })

    vi.spyOn(global, 'fetch').mockResolvedValue(
      mock<Response>({
        status: 404,
        json: () =>
          Promise.resolve({
            common: themeConfig.common,
            clients: {
              web: {
                defaults: customTheme.defaults,
                themes: customTheme.themes
              }
            }
          })
      })
    )

    const theme1 = await loadTheme('http://www.opencloud.eu/custom.json')
    const theme2 = await loadTheme('/custom.json')

    expect(theme1).toMatchObject(customTheme)
    expect(theme2).toMatchObject(customTheme)
  })
})
