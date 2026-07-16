import type { App, ComponentCustomProperties, Ref } from 'vue'
import type { RouteLocationRaw, Router, RouteRecordRaw } from 'vue-router'
import type { Extension, ExtensionPoint } from '../composables/piniaStores'
import type { IconFillType } from '../helpers'
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
  fillType?: IconFillType
  icon?: string
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
   * Note that in the file list, the icon might be overridden if there is a
   * default icon defined for the given file type.
   */
  icon?: string
  /**
   * Defines the color of the icon in the file list.
   * In the "New"- and "Open with..."-menu, colors are not used, so this will be ignored.
   * Defaults to the `color` property of the application if not specified.
   *
   * Note that in the file list, the icon might be overridden if there is a
   * default icon defined for the given file type.
   */
  iconColor?: string
  /**
   * Defines the fill type of the icon in the "Open with..."-menu.
   * In the file list and the "New"-menu, the fill type is always `fill`, so this will be ignored.
   * Defaults to `line` in the "Open with..."-menu if not specified.
   */
  iconFillType?: IconFillType
  mimeType?: string
  newFileMenu?: {
    menuTitle: () => string
    // Optional override for the create-file modal's default name. Without
    // this, the modal falls back to "New file.<extension>". Folder-typed
    // entries (e.g. vault) override this to read "New vault.vault" etc.
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
  icon?: string
  /** @deprecated use the iconFillType on ApplicationFileExtension instead */
  iconFillType?: IconFillType
  /** @deprecated use the iconColor on ApplicationFileExtension instead */
  iconColor?: string
  img?: string
  meta?: {
    fileSizeLimit?: number
  }
  extensions?: ApplicationFileExtension[]
  defaultExtension?: string
  translations?: Translations
}

/**
 * ApplicationTranslations is a map of language keys to translations
 */
export interface ApplicationTranslations {
  [lang: string]: {
    [key: string]: string | string[]
  }
}

/** ClassicApplicationScript reflects classic application script structure */
export interface ClassicApplicationScript {
  appInfo?: ApplicationInformation
  routes?: ((args: GlobalProperties) => RouteRecordRaw[]) | RouteRecordRaw[]
  navItems?: ((args: GlobalProperties) => AppNavigationItem[]) | AppNavigationItem[]
  translations?: ApplicationTranslations
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
