import { Translations } from 'vue3-gettext'

export type InstallOptions = {
  /**
   * Prefix the url under which the icons are served.
   * Set this to '/' if all icons are served from the root of your application.
   * @default ''
   */
  iconUrlPrefix?: string

  language?: {
    /**
     * Whether to initialize the vue3-gettext plugin. This is required if your application
     * does not already use vue3-gettext.
     * @default false
     */
    initGettext?: boolean
    /**
     * Default language the design-system is being initialized with.
     * @default en
     */
    defaultLanguage?: string
    /**
     * Custom translations that override the default translations.
     * They need to be passed like so:
     * `{ en: { hello: 'world' } }`
     * @default undefined
     */
    translations?: Translations
  }

  /**
   * Tokens that can be used to customize the appearance of the design system.
   * @default null
   */
  tokens?: {
    roles?: {
      primary?: string
      surfaceTint?: string
      onPrimary?: string
      primaryContainer?: string
      onPrimaryContainer?: string
      secondary?: string
      onSecondary?: string
      secondaryContainer?: string
      onSecondaryContainer?: string
      tertiary?: string
      onTertiary?: string
      tertiaryContainer?: string
      onTertiaryContainer?: string
      error?: string
      onError?: string
      errorContainer?: string
      onErrorContainer?: string
      background?: string
      onBackground?: string
      surface?: string
      onSurface?: string
      surfaceVariant?: string
      onSurfaceVariant?: string
      outline?: string
      outlineVariant?: string
      shadow?: string
      scrim?: string
      inverseSurface?: string
      inverseOnSurface?: string
      inversePrimary?: string
      primaryFixed?: string
      onPrimaryFixed?: string
      primaryFixedDim?: string
      onPrimaryFixedVariant?: string
      secondaryFixed?: string
      onSecondaryFixed?: string
      secondaryFixedDim?: string
      onSecondaryFixedVariant?: string
      tertiaryFixed?: string
      onTertiaryFixed?: string
      tertiaryFixedDim?: string
      onTertiaryFixedVariant?: string
      surfaceDim?: string
      surfaceBright?: string
      surfaceContainerLowest?: string
      surfaceContainerLow?: string
      surfaceContainer?: string
      surfaceContainerHigh?: string
      surfaceContainerHighest?: string
      chrome?: string
      onChrome?: string
    }
    colorPalette?: Record<string, string>
    fontFamily?: string
  }
}
