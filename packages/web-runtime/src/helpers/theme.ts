import { v4 as uuidV4 } from 'uuid'
import { ThemeConfig, ThemeConfigType } from '@opencloud-eu/web-pkg'

export const loadTheme = async (location = ''): Promise<ThemeConfigType> => {
  try {
    const response = await fetch(location, { headers: { 'X-Request-ID': uuidV4() } })
    if (!response.ok) {
      throw new Error()
    }

    const theme = await response.json()
    return ThemeConfig.parse(theme)
  } catch (e) {
    console.error(`Failed to load theme '${e}'`)
  }
}
