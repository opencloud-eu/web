import merge from 'deepmerge'
import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import { useLocalStorage, usePreferredDark } from '@vueuse/core'
import { z } from 'zod'
import { applyCustomProp } from '@opencloud-eu/design-system/helpers'
import { ShareRole } from '@opencloud-eu/web-client'

const CommonSection = z.object({
  name: z.string().optional(),
  slogan: z.string().optional(),
  logo: z.string().optional(),
  urls: z
    .object({
      accessDeniedHelp: z.string(),
      imprint: z.string(),
      privacy: z.string()
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
  breakpoints: z.record(z.string()).optional(),
  colorPalette: z.record(z.string()).optional(),
  fontFamily: z.string().optional(),
  fontSizes: z.record(z.string()).optional(),
  sizes: z.record(z.string()).optional(),
  spacing: z.record(z.string()).optional()
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

export const useThemeStore = defineStore('theme', () => {
  const currentLocalStorageThemeName = useLocalStorage(themeStorageKey, null)

  const isDark = usePreferredDark()

  const currentTheme = ref<WebThemeType | undefined>()

  const availableThemes = ref<WebThemeType[]>([])

  const initializeThemes = (themeConfig: ThemeConfigType) => {
    const baseTheme = merge(themeConfig.common, themeConfig.clients.web.defaults)
    availableThemes.value = themeConfig.clients.web.themes.map((theme) => {
      return merge(baseTheme, theme)
    })
    setThemeFromStorageOrSystem()
  }

  const setThemeFromStorageOrSystem = () => {
    const firstLightTheme = unref(availableThemes).find((theme) => !theme.isDark)
    const firstDarkTheme = unref(availableThemes).find((theme) => theme.isDark)
    setAndApplyTheme(
      unref(availableThemes).find((t) => t.name === unref(currentLocalStorageThemeName)) ||
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
      currentLocalStorageThemeName.value = unref(currentTheme).name
    }

    const customizableDesignTokens = [
      { name: 'breakpoints', prefix: 'breakpoint' },
      { name: 'colorPalette', prefix: 'color' },
      { name: 'fontSizes', prefix: 'font-size' },
      { name: 'sizes', prefix: 'size' },
      { name: 'spacing', prefix: 'spacing' }
    ] as const

    applyCustomProp('font-family', unref(currentTheme).designTokens.fontFamily)

    customizableDesignTokens.forEach((token) => {
      for (const param in unref(currentTheme).designTokens[token.name]) {
        applyCustomProp(
          `${token.prefix}-${param}`,
          unref(currentTheme).designTokens[token.name][param]
        )
      }
    })
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
