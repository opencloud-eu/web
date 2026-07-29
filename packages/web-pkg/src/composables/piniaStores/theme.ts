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

  // Custom prop keys (without the `--oc-` prefix) applied by the active theme, so a
  // following theme can clear the ones it does not define instead of leaking them
  // (applyCustomProp only sets, never clears).
  const appliedCustomProps = ref<string[]>([])

  const initializeThemes = (themeConfig: ThemeConfigType) => {
    const commonThemeConfig = themeConfig.common as WebThemeType
    const webThemeConfig = themeConfig.clients.web.defaults as WebThemeType
    const baseTheme = merge(commonThemeConfig, webThemeConfig)
    availableThemes.value = themeConfig.clients.web.themes.map((theme) => {
      return merge(baseTheme, theme)
    })
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

    // A theme only overrides the tokens it defines; the rest fall back to the design-system
    // defaults (design-system/src/styles/defaults.css). applyCustomProp writes those overrides
    // as inline styles on :root and only ever sets, never clears - so an override from the
    // previous theme (e.g. the Windows 95 pixel font) would stick when switching to a theme
    // that leaves that token at its default. So: remove what the previous theme set, then apply
    // this theme's tokens and remember them for the next switch.
    const root = document.documentElement
    unref(appliedCustomProps).forEach((key) => root.style.removeProperty(`--oc-${key}`))

    const appliedProps: string[] = []
    const apply = (key: string, value: string | undefined) => {
      if (value === undefined) {
        return
      }
      applyCustomProp(key, value)
      appliedProps.push(key)
    }

    apply('font-family', theme.designTokens?.fontFamily)

    const customizableDesignTokens = [
      { name: 'roles', prefix: 'role' },
      { name: 'colorPalette', prefix: 'color' }
    ] as const
    customizableDesignTokens.forEach(({ name, prefix }) => {
      const tokens = theme.designTokens?.[name]
      for (const param in tokens) {
        apply(`${prefix}-${kebabCase(param)}`, tokens[param])
      }
    })

    if (!theme.designTokens?.roles?.chrome) {
      // fallback to surfaceContainer if chrome is not defined since it may not be set
      apply('role-chrome', theme.designTokens?.roles?.surfaceContainer)
      apply('role-on-chrome', theme.designTokens?.roles?.onSurface)
    }

    appliedCustomProps.value = appliedProps

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
