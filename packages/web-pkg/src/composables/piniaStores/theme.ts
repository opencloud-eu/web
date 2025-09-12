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
  colorPalette: z.record(z.string(), z.string()).optional(),
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

export const useThemeStore = defineStore('theme', () => {
  const currentLocalStorageThemeName = useLocalStorage(themeStorageKey, null)

  const isDark = usePreferredDark()

  const currentTheme = ref<WebThemeType | undefined>()

  const availableThemes = ref<WebThemeType[]>([])

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

    const customizableDesignTokens = [
      { name: 'roles', prefix: 'role' },
      { name: 'colorPalette', prefix: 'color' }
    ] as const

    applyCustomProp('font-family', unref(currentTheme).designTokens.fontFamily)

    customizableDesignTokens.forEach((token) => {
      for (const param in unref(currentTheme).designTokens[token.name]) {
        applyCustomProp(
          `${token.prefix}-${kebabCase(param)}`,
          unref(currentTheme).designTokens[token.name][param]
        )
      }
    })

    if (!unref(currentTheme).designTokens?.roles?.chrome) {
      // fallback to surfaceContainer if chrome is not defined since it may not be set
      applyCustomProp('role-chrome', unref(currentTheme).designTokens?.roles?.surfaceContainer)
      applyCustomProp('role-on-chrome', unref(currentTheme).designTokens?.roles?.onSurface)
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
