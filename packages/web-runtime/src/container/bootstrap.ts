import { registerClient } from '../services/clientRegistration'
import { buildApplication, loadApplication, NextApplication } from './application'
import { RouteLocationRaw, Router, RouteRecordNormalized } from 'vue-router'
import { App, computed, watch } from 'vue'
import { loadTheme } from '../helpers/theme'
import { createGettext, GetTextOptions, Language, Translations } from 'vue3-gettext'
import { getBackendVersion, getWebVersion } from './versions'
import {
  useModals,
  useThemeStore,
  useUserStore,
  UserStore,
  useMessages,
  useSpacesStore,
  useAuthStore,
  AuthStore,
  useCapabilityStore,
  CapabilityStore,
  useExtensionRegistry,
  ExtensionRegistry,
  useAppsStore,
  AppsStore,
  useConfigStore,
  ConfigStore,
  RawConfig,
  useSharesStore,
  useResourcesStore,
  ResourcesStore,
  SpacesStore,
  MessageStore,
  SharesStore,
  ArchiverService,
  RawConfigSchema,
  SentryConfig,
  AppProviderService,
  WebWorkersStore,
  useWebWorkersStore,
  ClientService,
  LoadingService,
  PasswordPolicyService,
  PreviewService,
  UppyService,
  AppConfigObject,
  resourceIconMappingInjectionKey,
  ResourceIconMapping,
  ClassicApplicationScript,
  UpdatesStore,
  useUpdatesStore,
  Updates,
  useGroupwareConfigStore,
  GroupwareConfigStore,
  RawGroupwareConfigSchema,
  useSideBar
} from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth'
import { init as sentryInit } from '@sentry/vue'
import { v4 as uuidV4 } from 'uuid'
import { merge } from 'lodash-es'
import { MESSAGE_TYPE } from '@opencloud-eu/web-client/sse'
import { getQueryParam } from '../helpers/url'
import PQueue from 'p-queue'
import { getExtensionNavItems } from '../helpers/navItems'
import {
  onSSEFileLockingEvent,
  onSSEItemRenamedEvent,
  onSSEProcessingFinishedEvent,
  onSSEItemRestoredEvent,
  onSSEItemTrashedEvent,
  onSSEFolderCreatedEvent,
  onSSEFileTouchedEvent,
  onSSEItemMovedEvent,
  onSSESpaceMemberAddedEvent,
  onSSESpaceMemberRemovedEvent,
  onSSESpaceShareUpdatedEvent,
  onSSEShareCreatedEvent,
  onSSEShareRemovedEvent,
  onSSEShareUpdatedEvent,
  onSSELinkCreatedEvent,
  onSSELinkRemovedEvent,
  sseEventWrapper,
  onSSELinkUpdatedEvent,
  onSSEBackchannelLogoutEvent,
  SseEventWrapperOptions
} from './sse'
import { loadAppTranslations } from '../helpers/language'
import { urlJoin } from '@opencloud-eu/web-client'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

// Snapshot embed query params on first call so they survive Vue Router
// navigations (the delegated-auth callback redirects to /files/spaces/…,
// which strips the original query string before the second config load).
let cachedEmbedConfig: RawConfig['options']['embed'] | undefined

const getEmbedConfigFromQuery = (
  doesEmbedEnabledOptionExists: boolean
): RawConfig['options']['embed'] => {
  if (cachedEmbedConfig) {
    return cachedEmbedConfig
  }

  const config: RawConfig['options']['embed'] = {}

  if (!doesEmbedEnabledOptionExists) {
    config.enabled = getQueryParam('embed') === 'true'
  }

  // Can enable location picker or file picker in embed mode
  const embedTarget = getQueryParam('embed-target')

  if (embedTarget) {
    config.target = embedTarget
  }

  // Can enable file name input for location picker
  const embedChooseFileName = getQueryParam('embed-choose-file-name')

  config.chooseFileName = embedChooseFileName === 'true'

  // Initial value for file name input in location picker
  const embedChooseFileNameSuggestion = getQueryParam('embed-choose-file-name-suggestion')

  if (embedChooseFileNameSuggestion) {
    config.chooseFileNameSuggestion = embedChooseFileNameSuggestion
  }

  const embedFileTypes = getQueryParam('embed-file-types')

  if (embedFileTypes) {
    config.fileTypes = embedFileTypes.split(',')
  }

  const delegateAuthentication = getQueryParam('embed-delegate-authentication')

  if (delegateAuthentication) {
    config.delegateAuthentication = delegateAuthentication === 'true'
  }

  const delegateAuthenticationOrigin = getQueryParam('embed-delegate-authentication-origin')

  if (delegateAuthentication) {
    config.delegateAuthenticationOrigin = delegateAuthenticationOrigin
  }

  cachedEmbedConfig = config
  return config
}

/**
 * fetch runtime configuration, this step is optional, all later steps can use a static
 * configuration object as well
 *
 * @remarks
 * does not check if the configuration is valid, for now be careful until a schema is declared
 *
 * @param path - path to main configuration
 */
export const announceConfiguration = async ({
  path,
  configStore,
  token
}: {
  path: string
  configStore: ConfigStore
  token?: string
}) => {
  const request = await fetch(path, {
    headers: { 'X-Request-ID': uuidV4(), ...(token && { Authorization: `Bearer ${token}` }) }
  })
  if (request.status !== 200) {
    throw new Error(`config could not be loaded. HTTP status-code ${request.status}`)
  }

  const data = await request.json().catch((error) => {
    throw new Error(`config could not be parsed. ${error}`)
  })

  const rawConfig = RawConfigSchema.parse(data)

  const embedConfigFromQuery = getEmbedConfigFromQuery(
    rawConfig.options?.embed &&
      Object.prototype.hasOwnProperty.call(rawConfig.options.embed, 'enabled')
  )

  rawConfig.options = {
    ...rawConfig.options,
    embed: { ...rawConfig.options?.embed, ...embedConfigFromQuery },
    hideLogo: getQueryParam('hide-logo') === 'true'
  }

  configStore.loadConfig(rawConfig)
}

/**
 * announce auth client to the runtime, currently only openIdConnect is supported here
 *
 * @remarks
 * if config does not ship any options for openIdConnect this step get skipped
 *
 * @param configStore
 */
export const announceAuthClient = async (configStore: ConfigStore): Promise<void> => {
  const openIdConnect = configStore.openIdConnect || {}

  if (!openIdConnect.dynamic) {
    return
  }

  const { client_id: clientId, client_secret: clientSecret } = await registerClient(openIdConnect)
  openIdConnect.client_id = clientId
  openIdConnect.client_secret = clientSecret
}

/**
 * announce applications to the runtime, it takes care that all requirements are fulfilled and then:
 * - bulk loads all application scripts
 * - builds and registers applications one by one (for a stable order)
 * - bulk initializes all applications
 */
export const initializeApplications = async ({
  app,
  configStore,
  router,
  appProviderService,
  appProviderApps
}: {
  app: App
  configStore: ConfigStore
  router: Router
  appProviderService: AppProviderService
  appProviderApps?: boolean
}): Promise<NextApplication[]> => {
  type RawApplication = {
    path?: string
    config?: AppConfigObject
  }
  type ApplicationResponse = {
    appName?: string
    applicationKey: string
    applicationPath: string
    applicationConfig: AppConfigObject
    applicationScript: ClassicApplicationScript
  }

  let applicationKeys: string[] = []
  let applicationResponses: PromiseSettledResult<ApplicationResponse>[] = []
  if (appProviderApps) {
    applicationKeys = appProviderService.appNames.map((appName) => `web-app-external-${appName}`)
    applicationResponses = await Promise.allSettled(
      appProviderService.appNames.map((appName) =>
        loadApplication({
          appName,
          applicationKey: `web-app-external-${appName}`,
          applicationPath: 'web-app-external',
          applicationConfig: {},
          configStore
        })
      )
    )
  } else {
    const rawApplications: RawApplication[] = [
      ...configStore.apps.map((application) => ({
        path: `web-app-${application}`
      })),
      ...configStore.externalApps
    ]
    applicationKeys = rawApplications.map((rawApplication) => rawApplication.path)
    applicationResponses = await Promise.allSettled(
      rawApplications.map((rawApplications) =>
        loadApplication({
          applicationKey: rawApplications.path,
          applicationPath: rawApplications.path,
          applicationConfig: rawApplications.config || {},
          configStore
        })
      )
    )
  }
  const applicationScripts = applicationResponses.reduce<ApplicationResponse[]>(
    (acc, applicationResponse) => {
      // we don't want to fail hard with the full system when one specific application can't get loaded. only log the error.
      if (applicationResponse.status !== 'fulfilled') {
        console.error(applicationResponse.reason)
      } else {
        acc.push(applicationResponse.value)
      }

      return acc
    },
    []
  )

  // create applications in a stable order, one by one, so that apps and extensions get registered in the same order every time.
  const applications: NextApplication[] = []
  for (const applicationKey of applicationKeys) {
    const applicationResponse = applicationScripts.find(
      (appResponse) => appResponse.applicationKey === applicationKey
    )
    if (!applicationResponse) {
      continue
    }
    try {
      applications.push(
        buildApplication({
          ...applicationResponse,
          app,
          router
        })
      )
    } catch (error) {
      console.error(error)
    }
  }

  await Promise.all(applications.map((application) => application.initialize()))

  return applications
}

/**
 * Bulk activate all applications, all applications are registered, it's safe to request a application api here
 *
 * @param applications
 */
export const announceApplicationsReady = async ({
  app,
  appsStore,
  applications
}: {
  app: App
  appsStore: AppsStore
  applications: NextApplication[]
}): Promise<void> => {
  await Promise.all(applications.map((application) => application.ready()))

  const mapping: ResourceIconMapping = {
    mimeType: {},
    extension: {}
  }

  appsStore.fileExtensions.forEach((fileExtensions) => {
    const app = appsStore.apps[fileExtensions.app]

    const getIconDefinition = () => {
      return {
        name: fileExtensions.icon || app.icon,
        ...(app.iconFillType && {
          fillType: app.iconFillType
        }),
        ...(app.iconColor && {
          color: app.iconColor
        })
      }
    }

    if (fileExtensions.mimeType) {
      mapping.mimeType[fileExtensions.mimeType] = getIconDefinition()
    }

    if (fileExtensions.extension) {
      mapping.extension[fileExtensions.extension] = getIconDefinition()
    }
  })

  app.provide(resourceIconMappingInjectionKey, mapping)
}

/**
 * announce runtime theme to the runtime, this also takes care that the store
 * and designSystem has all needed information to render the customized ui
 *
 * @param themeLocation
 * @param vue
 * @param designSystem
 */
export const announceTheme = async ({
  app,
  designSystem,
  configStore
}: {
  app: App
  designSystem: any
  configStore: ConfigStore
}): Promise<void> => {
  const themeStore = useThemeStore()
  const { initializeThemes } = themeStore

  const webTheme = await loadTheme(configStore.theme)

  initializeThemes(webTheme)

  app.use(designSystem)
}

export const announcePiniaStores = () => {
  const appsStore = useAppsStore()
  const authStore = useAuthStore()
  const capabilityStore = useCapabilityStore()
  const extensionRegistry = useExtensionRegistry()
  const configStore = useConfigStore()
  const messagesStore = useMessages()
  const modalStore = useModals()
  const resourcesStore = useResourcesStore()
  const sharesStore = useSharesStore()
  const spacesStore = useSpacesStore()
  const userStore = useUserStore()
  const webWorkersStore = useWebWorkersStore()
  const updatesStore = useUpdatesStore()
  const groupwareConfigStore = useGroupwareConfigStore()
  const sidebarStore = useSideBar()

  return {
    appsStore,
    authStore,
    capabilityStore,
    extensionRegistry,
    configStore,
    resourcesStore,
    messagesStore,
    modalStore,
    sharesStore,
    spacesStore,
    userStore,
    webWorkersStore,
    updatesStore,
    groupwareConfigStore,
    sidebarStore
  }
}

export const announceGettext = ({
  app,
  ...options
}: {
  app: App
} & Partial<GetTextOptions>) => {
  const gettext = createGettext({
    defaultLanguage: navigator.language.substring(0, 2),
    silent: true,
    ...options
  })
  app.use(gettext)
  return gettext
}

export const announceTranslations = ({
  gettext,
  coreTranslations,
  customTranslations,
  appsStore
}: {
  gettext: Language
  coreTranslations: Translations
  customTranslations?: Translations
  appsStore?: AppsStore
}) => {
  gettext.translations = merge(coreTranslations, customTranslations || {})

  if (appsStore) {
    loadAppTranslations({
      apps: appsStore.apps,
      gettext,
      lang: gettext.current
    })
  }
}

/**
 * announce clientService and inject it into vue
 *
 * @param vue
 * @param configStore
 */
export const announceClientService = ({
  app,
  configStore,
  authStore
}: {
  app: App
  configStore: ConfigStore
  authStore: AuthStore
}): ClientService => {
  const clientService = new ClientService({
    configStore,
    language: app.config.globalProperties.$language,
    authStore
  })
  app.config.globalProperties.$clientService = clientService
  app.provide('$clientService', clientService)
  return clientService
}

export const announceArchiverService = ({
  app,
  configStore,
  userStore,
  capabilityStore
}: {
  app: App
  configStore: ConfigStore
  userStore: UserStore
  capabilityStore: CapabilityStore
}): void => {
  app.config.globalProperties.$archiverService = new ArchiverService(
    app.config.globalProperties.$clientService,
    userStore,
    configStore.serverUrl,
    computed(
      () =>
        capabilityStore.filesArchivers || [
          {
            enabled: true,
            version: '1.0.0',
            formats: ['tar', 'zip'],
            archiver_url: urlJoin(configStore.serverUrl, 'index.php/apps/files/ajax/download.php')
          }
        ]
    )
  )

  app.provide('$archiverService', app.config.globalProperties.$archiverService)
}

/**
 * @param vue
 */
export const announceLoadingService = ({ app }: { app: App }): void => {
  const loadingService = new LoadingService()
  app.config.globalProperties.$loadingService = loadingService
  app.provide('$loadingService', loadingService)
}

/**
 * announce uppyService and inject it into vue
 *
 * @param vue
 */
export const announceUppyService = ({ app }: { app: App }): void => {
  app.config.globalProperties.$uppyService = new UppyService({
    language: app.config.globalProperties.$language
  })
  app.provide('$uppyService', app.config.globalProperties.$uppyService)
}

/**
 * @param vue
 * @param store
 * @param configStore
 */
export const announcePreviewService = ({
  app,
  configStore,
  userStore,
  authStore
}: {
  app: App
  configStore: ConfigStore
  userStore: UserStore
  authStore: AuthStore
}): void => {
  const clientService = app.config.globalProperties.$clientService
  const previewService = new PreviewService({
    clientService,
    userStore,
    authStore,
    configStore
  })
  app.config.globalProperties.$previewService = previewService
  app.provide('$previewService', previewService)
}

/**
 * announce authService and inject it into vue
 *
 * @param vue
 * @param configStore
 * @param store
 * @param router
 */
export const announceAuthService = ({
  app,
  configStore,
  router,
  userStore,
  authStore,
  capabilityStore,
  webWorkersStore
}: {
  app: App
  configStore: ConfigStore
  router: Router
  userStore: UserStore
  authStore: AuthStore
  capabilityStore: CapabilityStore
  webWorkersStore: WebWorkersStore
}): void => {
  const ability = app.config.globalProperties.$ability
  const language = app.config.globalProperties.$language
  const clientService = app.config.globalProperties.$clientService
  authService.initialize(
    configStore,
    clientService,
    router,
    ability,
    language,
    userStore,
    authStore,
    capabilityStore,
    webWorkersStore
  )
  app.config.globalProperties.$authService = authService
  app.provide('$authService', authService)
}

/**
 * Announce the app provider service (collaborative apps)
 *
 * @param app
 * @param capabilityStore
 * @param clientService
 */
export const announceAppProviderService = ({
  app,
  serverUrl,
  clientService
}: {
  app: App
  serverUrl: string
  clientService: ClientService
}): AppProviderService => {
  const appProviderService = new AppProviderService(serverUrl, clientService)
  app.config.globalProperties.$appProviderService = appProviderService
  app.provide('$appProviderService', appProviderService)
  return appProviderService
}

/**
 * @param vue
 */
export const announcePasswordPolicyService = ({ app }: { app: App }): void => {
  const language = app.config.globalProperties.$language
  const passwordPolicyService = new PasswordPolicyService({ language })
  app.config.globalProperties.passwordPolicyService = passwordPolicyService
  app.provide('$passwordPolicyService', passwordPolicyService)
}

/**
 * announce runtime defaults, this is usual the last needed announcement before rendering the actual ui
 *
 * @param vue
 * @param router
 */
export const announceDefaults = ({
  appsStore,
  extensionRegistry,
  router,
  configStore
}: {
  appsStore: AppsStore
  router: Router
  extensionRegistry: ExtensionRegistry
  configStore: ConfigStore
}): void => {
  // set home route
  const appIds = appsStore.appIds
  let defaultAppId = configStore.options.defaultAppId
  if (!appIds.includes(defaultAppId)) {
    defaultAppId = appIds.find((appId) => appId === 'files') || appIds[0]
  }

  let route: RouteRecordNormalized | RouteLocationRaw = router.getRoutes().find((r) => {
    return r.path.startsWith(`/${defaultAppId}`) && r.meta?.entryPoint === true
  })
  if (!route) {
    route = getExtensionNavItems({ extensionRegistry, appId: defaultAppId })[0]?.route
  }
  if (route) {
    router.addRoute({
      path: '/',
      redirect: () => route
    })
  }
}

/**
 * announce some version numbers
 *
 * @param capabilityStore
 */
export const announceVersions = ({
  capabilityStore
}: {
  capabilityStore: CapabilityStore
}): void => {
  const versions = [getWebVersion(), getBackendVersion({ capabilityStore })].filter(Boolean)
  versions.forEach((version) => {
    console.log(
      `%c ${version} `,
      'background-color: #041E42; color: #FFFFFF; font-weight: bold; border: 1px solid #FFFFFF; padding: 5px;'
    )
  })
}

/**
 * announce updates
 *
 * @param updateStore
 * @param capabilityStore
 * @param configStore
 * @param clientService
 */
export const announceUpdates = async ({
  updatesStore,
  capabilityStore,
  configStore,
  clientService
}: {
  updatesStore: UpdatesStore
  capabilityStore: CapabilityStore
  configStore: ConfigStore
  clientService: ClientService
}): Promise<void> => {
  if (!capabilityStore.capabilities.core['check-for-updates']) {
    return
  }

  try {
    const encoder = new TextEncoder()
    const sha256ServerUrl = sha256(encoder.encode(configStore.serverUrl))

    updatesStore.setIsLoading(true)
    const { data }: { data: Updates } = await clientService.httpUnAuthenticated.get(
      'https://update.opencloud.eu/server.json',
      {
        headers: {
          'Cache-Control': 'no-cache'
        },
        params: {
          server: bytesToHex(sha256ServerUrl),
          edition: capabilityStore.status.edition || 'rolling',
          version: capabilityStore.status.productversion
        }
      }
    )

    updatesStore.setUpdates(data)
  } catch (e) {
    console.error(e)
    updatesStore.setHasError(true)
  } finally {
    updatesStore.setIsLoading(false)
  }
}

/**
 * starts the sentry monitor
 *
 * @remarks
 * if config does not contain dsn sentry will not be started
 *
 * @param configStore
 * @param app
 */
export const startSentry = (configStore: ConfigStore, app: App): void => {
  if (configStore.sentry?.dsn) {
    const {
      dsn,
      environment = 'production',
      transportOptions,
      ...moreSentryOptions
    } = configStore.sentry

    sentryInit({
      app,
      dsn,
      environment,
      attachProps: true,
      transportOptions: transportOptions as SentryConfig['transportOptions'],
      ...moreSentryOptions
    })
  }
}

/**
 * announceCustomScripts injects custom header scripts.
 *
 * @param configStore
 */
export const announceCustomScripts = ({ configStore }: { configStore?: ConfigStore }): void => {
  configStore.scripts.forEach(({ src = '', async = false }) => {
    if (!src) {
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = async
    document.head.appendChild(script)
  })
}

/**
 * announceCustomStyles injects custom header styles.
 *
 * @param configStore
 */
export const announceCustomStyles = ({ configStore }: { configStore?: ConfigStore }): void => {
  configStore.styles.forEach(({ href = '' }) => {
    if (!href) {
      return
    }

    const link = document.createElement('link')
    link.href = href
    link.type = 'text/css'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  })
}

/**
 * announce Groupware.
 *
 * @param clientService
 * @param capabilityStore
 * @param configStore
 * @param groupwareConfigStore
 */
export const announceGroupware = async ({
  clientService,
  configStore,
  capabilityStore,
  groupwareConfigStore
}: {
  clientService: ClientService
  configStore: ConfigStore
  capabilityStore: CapabilityStore
  groupwareConfigStore: GroupwareConfigStore
}) => {
  if (!capabilityStore.capabilities.groupware?.enabled) {
    return
  }
  try {
    const { data } = await clientService.httpAuthenticated.get(configStore.groupwareUrl)
    groupwareConfigStore.loadGroupwareConfig(RawGroupwareConfigSchema.parse(data))
  } catch (e) {
    console.error(`Unable to load groupware config ${e}`)
  }
}

export const registerSSEEventListeners = ({
  language,
  resourcesStore,
  spacesStore,
  messageStore,
  sharesStore,
  clientService,
  previewService,
  configStore,
  userStore,
  router
}: {
  language: Language
  resourcesStore: ResourcesStore
  spacesStore: SpacesStore
  messageStore: MessageStore
  sharesStore: SharesStore
  clientService: ClientService
  previewService: PreviewService
  configStore: ConfigStore
  userStore: UserStore
  router: Router
}): void => {
  const resourceQueue = new PQueue({
    concurrency: configStore.options.concurrentRequests.sse
  })

  watch(
    () => resourcesStore.currentFolder,
    () => {
      resourceQueue.clear()
    }
  )

  const sseEventWrapperOptions = {
    resourcesStore,
    spacesStore,
    messageStore,
    userStore,
    sharesStore,
    configStore,
    clientService,
    previewService,
    language,
    router,
    resourceQueue
  } satisfies Partial<SseEventWrapperOptions>

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.ITEM_RENAMED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.ITEM_RENAMED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEItemRenamedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.POSTPROCESSING_FINISHED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.POSTPROCESSING_FINISHED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEProcessingFinishedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.FILE_LOCKED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.FILE_LOCKED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEFileLockingEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.FILE_UNLOCKED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.FILE_UNLOCKED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEFileLockingEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.ITEM_TRASHED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.ITEM_TRASHED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEItemTrashedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.ITEM_RESTORED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.ITEM_RESTORED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEItemRestoredEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.ITEM_MOVED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.ITEM_MOVED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEItemMovedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.FOLDER_CREATED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.FOLDER_CREATED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEFolderCreatedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.FILE_TOUCHED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.FILE_TOUCHED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEFileTouchedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.SPACE_MEMBER_ADDED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.SPACE_MEMBER_ADDED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSESpaceMemberAddedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.SPACE_MEMBER_REMOVED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.SPACE_MEMBER_REMOVED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSESpaceMemberRemovedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.SPACE_SHARE_UPDATED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.SPACE_SHARE_UPDATED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSESpaceShareUpdatedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.SHARE_CREATED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.SHARE_CREATED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEShareCreatedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.SHARE_REMOVED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.SHARE_REMOVED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEShareRemovedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.SHARE_UPDATED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.SHARE_UPDATED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEShareUpdatedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.LINK_CREATED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.LINK_CREATED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSELinkCreatedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.LINK_REMOVED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.LINK_REMOVED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSELinkRemovedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.LINK_UPDATED, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.LINK_UPDATED,
      msg,
      ...sseEventWrapperOptions,
      method: onSSELinkUpdatedEvent
    })
  )

  clientService.sseAuthenticated.addEventListener(MESSAGE_TYPE.BACKCHANNEL_LOGOUT, (msg) =>
    sseEventWrapper({
      topic: MESSAGE_TYPE.BACKCHANNEL_LOGOUT,
      msg,
      ...sseEventWrapperOptions,
      method: onSSEBackchannelLogoutEvent
    })
  )
}

export const setViewOptions = ({ resourcesStore }: { resourcesStore: ResourcesStore }) => {
  /**
   *   Storage returns a string so we need to convert it into a boolean
   */
  const areHiddenFilesShown = window.localStorage.getItem('oc_hiddenFilesShown') || 'false'
  const areHiddenFilesShownBoolean = areHiddenFilesShown === 'true'

  if (areHiddenFilesShownBoolean !== resourcesStore.areHiddenFilesShown) {
    resourcesStore.setAreHiddenFilesShown(areHiddenFilesShownBoolean)
  }

  const areFileExtensionsShown = window.localStorage.getItem('oc_fileExtensionsShown') || 'true'
  const areFileExtensionsShownBoolean = areFileExtensionsShown === 'true'

  if (areFileExtensionsShownBoolean !== resourcesStore.areFileExtensionsShown) {
    resourcesStore.setAreFileExtensionsShown(areFileExtensionsShownBoolean)
  }

  const areWebDavDetailsShown = window.localStorage.getItem('oc_webDavDetailsShown') || 'false'
  const areWebDavDetailsShownBoolean = areWebDavDetailsShown === 'true'

  if (areWebDavDetailsShownBoolean !== resourcesStore.areWebDavDetailsShown) {
    resourcesStore.setAreWebDavDetailsShown(areWebDavDetailsShownBoolean)
  }

  const areDisabledSpaceShown = window.localStorage.getItem('oc_disabledSpacesShown') || 'true'
  const areDisabledSpaceShownBoolean = areDisabledSpaceShown === 'true'

  if (areDisabledSpaceShownBoolean !== resourcesStore.areDisabledSpacesShown) {
    resourcesStore.setAreDisabledSpacesShown(areDisabledSpaceShownBoolean)
  }

  const areEmptyTrashesShown = window.localStorage.getItem('oc_emptyTrashesShown') || 'true'
  const areEmptyTrashesShownBoolean = areEmptyTrashesShown === 'true'

  if (areEmptyTrashesShownBoolean !== resourcesStore.areEmptyTrashesShown) {
    resourcesStore.setAreEmptyTrashesShown(areEmptyTrashesShownBoolean)
  }
}
