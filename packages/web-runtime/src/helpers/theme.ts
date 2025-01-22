import { v4 as uuidV4 } from 'uuid'
import { ThemingConfig } from '@opencloud-eu/web-pkg'

export const loadTheme = async (location = '') => {
  try {
    const response = await fetch(location, { headers: { 'X-Request-ID': uuidV4() } })
    if (!response.ok) {
      throw new Error()
    }

    const theme = await response.json()
    const parsedTheme = ThemingConfig.parse(theme)

    return {
      defaults: {
        common: parsedTheme.common,
        ...parsedTheme.clients.web.defaults
      },
      themes: parsedTheme.clients.web.themes
    }
  } catch {
    console.error(`Failed to load theme '${location}'`)
  }
}
