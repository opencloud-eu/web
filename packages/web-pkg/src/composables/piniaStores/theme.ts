import merge from 'deepmerge'
import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import { useLocalStorage, usePreferredDark } from '@vueuse/core'
import { z } from 'zod'
import { applyCustomProp } from '@opencloud-eu/design-system/helpers'
import { ShareRole } from '@opencloud-eu/web-client'
import kebabCase from 'lodash-es/kebabCase'

const CommonSection = z.object({
  name: z.string().optional(),
  slogan: z.string().optional(),
  logo: z.string().optional(),
  logoMobile: z.string().optional(),
  urls: z
    .object({
      accessDeniedHelp: z.string().optional(),
      imprint: z.string().optional(),
      privacy: z.string().optional(),
      accessibility: z.string().optional()
    })
    .optional(),
  shareRoles: z
    .record(
      z.string(),
      z.object({
        iconName: z.string()
      })
    )
    .optional()
})

const DesignTokens = z.object({
  roles: z.record(z.string(), z.string()).optional(),
  /** @deprecated */
  colorPalette: z.record(z.string(), z.string()).optional().meta({ deprecated: true }),
  fontFamily: z.string().optional()
})

const WebDefaults = CommonSection.extend({
  designTokens: DesignTokens.optional(),
  favicon: z.string().optional(),
  background: z.string().optional()
})

const WebTheme = WebDefaults.extend({
  isDark: z.boolean(),
  label: z.string()
})

export const WebThemeConfig = z.object({
  defaults: WebDefaults,
  themes: z.array(WebTheme)
})

export const ThemeConfig = z.object({
  common: CommonSection.optional(),
  clients: z.object({
    web: WebThemeConfig
  })
})

export type WebThemeType = z.infer<typeof WebTheme>
export type ThemeConfigType = z.infer<typeof ThemeConfig>

const themeStorageKey = 'oc_currentThemeName'

const setFavicon = (url: string) => {
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = url
}

export const useThemeStore = defineStore('theme', () => {
  const currentLocalStorageThemeName = useLocalStorage(themeStorageKey, null)

  const isDark = usePreferredDark()

  const currentTheme = ref<WebThemeType | undefined>()

  const availableThemes = ref<WebThemeType[]>([])

  // Custom prop keys (without the `--oc-` prefix) applied by the active theme,
  // so a following theme can clear the ones it doesn't define instead of
  // leaking them (applyCustomProp only sets, never clears).
  const appliedCustomProps = ref<string[]>([])

  const initializeThemes = (
    themeConfig: ThemeConfigType,
    additionalThemeConfigs: (ThemeConfigType | undefined)[] = []
  ) => {
    const commonThemeConfig = themeConfig.common as WebThemeType
    const webThemeConfig = themeConfig.clients.web.defaults as WebThemeType
    const baseTheme = merge(commonThemeConfig, webThemeConfig)

    const mainThemes = themeConfig.clients.web.themes.map((theme) => merge(baseTheme, theme))

    // Themes provided by (external) apps. Each may bring its own defaults,
    // merged over the base so app themes stay consistent with the deployment.
    // Configs that failed to load are undefined and skipped, so a single broken
    // app theme cannot take down the base theme.
    const additionalThemes = additionalThemeConfigs
      .filter((config): config is ThemeConfigType => Boolean(config))
      .flatMap((config) => {
        const additionalBaseTheme = merge(baseTheme, config.clients.web.defaults as WebThemeType)
        return config.clients.web.themes.map((theme) => merge(additionalBaseTheme, theme))
      })

    availableThemes.value = [...mainThemes, ...additionalThemes]
    setThemeFromStorageOrSystem()
  }

  const setThemeFromStorageOrSystem = () => {
    const firstLightTheme = unref(availableThemes).find((theme) => !theme.isDark)
    const firstDarkTheme = unref(availableThemes).find((theme) => theme.isDark)
    setAndApplyTheme(
      unref(availableThemes).find((t) => t.label === unref(currentLocalStorageThemeName)) ||
        (unref(isDark) ? firstDarkTheme : firstLightTheme) ||
        unref(availableThemes)[0],
      false
    )
  }

  const setAutoSystemTheme = () => {
    currentLocalStorageThemeName.value = null
    setThemeFromStorageOrSystem()
  }

  const isCurrentThemeAutoSystem = computed(() => {
    return currentLocalStorageThemeName.value === null
  })

  const setAndApplyTheme = (theme: WebThemeType, updateStorage = true) => {
    currentTheme.value = theme
    if (updateStorage) {
      currentLocalStorageThemeName.value = unref(currentTheme).label
    }

    document.documentElement.style.colorScheme = theme.isDark ? 'dark' : 'light'
    // Expose the active theme on the DOM so themes can attach structural CSS
    // (borders, radii, ...) that the design-token system alone cannot express.
    document.documentElement.dataset.theme = theme.label

    // Collect every custom prop this theme defines (font, color roles, the
    // deprecated palette). Props the previous theme set but this one omits are
    // removed afterwards, so nothing leaks across a theme switch (e.g. a pixel
    // font) - applyCustomProp only sets, never clears.
    const customProps: Record<string, string> = {}
    const setProp = (key: string, value: string | undefined) => {
      if (value !== undefined) {
        customProps[key] = value
      }
    }

    setProp('font-family', theme.designTokens?.fontFamily)

    const customizableDesignTokens = [
      { name: 'roles', prefix: 'role' },
      { name: 'colorPalette', prefix: 'color' }
    ] as const
    customizableDesignTokens.forEach((token) => {
      const tokens = theme.designTokens?.[token.name]
      for (const param in tokens) {
        setProp(`${token.prefix}-${kebabCase(param)}`, tokens[param])
      }
    })

    if (!theme.designTokens?.roles?.chrome) {
      // fallback to surfaceContainer if chrome is not defined since it may not be set
      setProp('role-chrome', theme.designTokens?.roles?.surfaceContainer)
      setProp('role-on-chrome', theme.designTokens?.roles?.onSurface)
    }

    const root = document.documentElement
    unref(appliedCustomProps)
      .filter((key) => !(key in customProps))
      .forEach((key) => root.style.removeProperty(`--oc-${key}`))
    Object.entries(customProps).forEach(([key, value]) => applyCustomProp(key, value))
    appliedCustomProps.value = Object.keys(customProps)

    if (theme.favicon) {
      setFavicon(theme.favicon)
    }
  }

  const getRoleIcon = (role: ShareRole) => {
    return unref(currentTheme).shareRoles[role.id]?.iconName || 'user'
  }

  return {
    availableThemes,
    currentTheme,
    initializeThemes,
    setAndApplyTheme,
    setAutoSystemTheme,
    isCurrentThemeAutoSystem,
    getRoleIcon
  }
})
