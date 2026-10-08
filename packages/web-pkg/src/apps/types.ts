import type { App, ComponentCustomProperties, Ref } from 'vue'
import type { RouteLocationRaw, Router, RouteRecordRaw } from 'vue-router'
import type { Extension, ExtensionPoint } from '../composables/piniaStores'
import type { IconFillType } from '../helpers'
import type { Icon } from '@opencloud-eu/design-system/helpers'
import type { Ability, Resource, SpaceResource } from '@opencloud-eu/web-client'
import type { Language, Translations } from 'vue3-gettext'
import type { Pinia } from 'pinia'
import type {
  AppProviderService,
  ArchiverService,
  ClientService,
  LoadingService,
  PasswordPolicyService,
  PreviewService,
  UppyService
} from '../services'
import type { AuthServiceInterface } from '../composables'

export interface GlobalProperties extends ComponentCustomProperties, Language {
  $ability: Ability
  $appProviderService: AppProviderService
  $archiverService: ArchiverService
  $authService: AuthServiceInterface
  $can: Ability['can']
  $clientService: ClientService
  $language: Language
  $loadingService: LoadingService
  $pinia: Pinia
  $previewService: PreviewService
  $router: Router
  $uppyService: UppyService
  passwordPolicyService: PasswordPolicyService
}

export interface AppReadyHookArgs {
  globalProperties: GlobalProperties
  instance?: App
}

export interface AppNavigationItem {
  isActive?: () => boolean
  activeFor?: { name?: string; path?: string }[]
  isVisible?: () => boolean
  /** @deprecated use a named icon for the `icon` instead */
  fillType?: IconFillType
  icon?: Icon
  name: string | (() => string)
  route?: RouteLocationRaw
  handler?: () => void
  priority?: number
}

export type AppConfigObject = Record<string, any>

export interface ApplicationFileExtension {
  app?: string
  extension?: string
  type?: 'file' | 'folder'
  createFileHandler?: (arg: {
    fileName: string
    space: SpaceResource
    currentFolder: Resource
  }) => Promise<Resource>
  hasPriority?: boolean
  label?: string | (() => string)
  name?: string
  /**
   * Defines the icon for the given file type in the file list, the "New"-
   * and the "Open with..."-menu.
   * Defaults to the `icon` property of the application if not specified.
   *
   * Note that in the file list and the "New"-menu, the icon is overridden if
   * there is a default icon defined for the given file type.
   */
  icon?: Icon
  /**
   * Defines the color of the `icon` of this file type. Only applies if the `icon` is
   * specified here and is not an image icon.
   *
   * @deprecated use a named icon for the `icon` instead
   */
  iconColor?: string
  /**
   * Defines the fill type of the `icon` of this file type. Only applies if the `icon` is
   * specified here and is not an image icon.
   *
   * @deprecated use a named icon for the `icon` instead
   */
  iconFillType?: IconFillType
  mimeType?: string
  newFileMenu?: {
    menuTitle: () => string
    // Optional override for the create-file modal's default name, e.g. to read
    // "New notebook.ocnb" instead of "New file.ocnb". Without this, the modal
    // falls back to "New file.<extension>".
    defaultName?: () => string
  }
  routeName?: string
  secureView?: boolean
}

/** ApplicationInformation describes required information of an application */
export interface ApplicationInformation {
  color?: string
  id?: string
  name?: string
  icon?: Icon
  /** @deprecated use a named icon for the `icon` instead */
  iconFillType?: IconFillType
  /** @deprecated use a named icon for the `icon` instead */
  iconColor?: string
  /** @deprecated use an image icon for the `icon` instead */
  img?: string
  meta?: {
    fileSizeLimit?: number
  }
  extensions?: ApplicationFileExtension[]
  defaultExtension?: string
  translations?: Translations | ApplicationTranslationLoaders
}

/**
 * ApplicationTranslations is a map of language keys to translations
 */
export interface ApplicationTranslations {
  [lang: string]: {
    [key: string]: string | string[]
  }
}

/**
 * ApplicationTranslationLoaders is a map of language keys to functions lazily loading the translations
 */
export interface ApplicationTranslationLoaders {
  [lang: string]: () => Promise<ApplicationTranslations[string]>
}

/** ClassicApplicationScript reflects classic application script structure */
export interface ClassicApplicationScript {
  appInfo?: ApplicationInformation
  routes?: ((args: GlobalProperties) => RouteRecordRaw[]) | RouteRecordRaw[]
  navItems?: ((args: GlobalProperties) => AppNavigationItem[]) | AppNavigationItem[]
  translations?: ApplicationTranslations | ApplicationTranslationLoaders
  extensions?: Ref<Extension[]>
  extensionPoints?: Ref<ExtensionPoint<any>[]>
  initialize?: () => void
  ready?: (args: AppReadyHookArgs) => Promise<void> | void
  mounted?: (args: AppReadyHookArgs) => void
  // TODO: move this to its own type
  setup?: (args: { applicationConfig: AppConfigObject }) => ClassicApplicationScript
}

export type ApplicationSetupOptions = {
  applicationConfig: AppConfigObject
  // external applications might have a name
  appName?: string
}

export const defineWebApplication = (args: {
  setup: (options: ApplicationSetupOptions) => ClassicApplicationScript
}) => {
  return args
}
