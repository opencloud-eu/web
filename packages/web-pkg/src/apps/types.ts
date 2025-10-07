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
import type { Wormhole } from 'portal-vue/types/types.js'

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
  $wormhole: Wormhole
  passwordPolicyService: PasswordPolicyService
}

export interface AppReadyHookArgs {
  globalProperties: GlobalProperties
  router: Router
  instance?: App
  portal?: any
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
  createFileHandler?: (arg: {
    fileName: string
    space: SpaceResource
    currentFolder: Resource
  }) => Promise<Resource>
  hasPriority?: boolean
  label?: string | (() => string)
  name?: string
  icon?: string
  mimeType?: string
  newFileMenu?: { menuTitle: () => string }
  routeName?: string
  secureView?: boolean
}

/** ApplicationInformation describes required information of an application */
export interface ApplicationInformation {
  color?: string
  id?: string
  name?: string
  icon?: string
  iconFillType?: IconFillType
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
