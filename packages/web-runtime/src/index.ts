import { loadDesignSystem, pages, loadTranslations, supportedLanguages } from './defaults'
import { router } from './router'
import { abilitiesPlugin } from '@casl/vue'
import { createMongoAbility } from '@casl/ability'

import { ModuleFederation } from '@module-federation/runtime'
import { registerSharedModules } from './container/application'
import {
  announceConfiguration,
  initializeApplications,
  announceApplicationsReady,
  announceDefaults,
  announceClientService,
  announceTheme,
  announcePiniaStores,
  announceCustomStyles,
  announceTranslations,
  announceVersions,
  announceUppyService,
  announceAuthService,
  startSentry,
  announceCustomScripts,
  announceLoadingService,
  announcePreviewService,
  announcePasswordPolicyService,
  registerSSEEventListeners,
  setViewOptions,
  announceGettext,
  announceArchiverService,
  announceAppProviderService,
  announceUpdates,
  announceGroupware,
  announceCapabilities
} from './container/bootstrap'
import { applicationStore } from './container/store'
import { PublicSpaceResource } from '@opencloud-eu/web-client'
import { loadCustomTranslations } from './helpers/customTranslations'
import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import { extensionPoints } from './extensionPoints'
import { extensions } from './extensions'

export const bootstrapApp = async (configurationPath: string, appsReadyCallback: () => void) => {
  const pinia = createPinia()
  const app = createApp(pages.success)
  app.use(pinia)

  const {
    appsStore,
    authStore,
    configStore,
    capabilityStore,
    extensionRegistry,
    spacesStore,
    userStore,
    resourcesStore,
    messagesStore,
    sharesStore,
    webWorkersStore,
    updatesStore,
    groupwareConfigStore
  } = announcePiniaStores()

  app.provide('$router', router)

  const [designSystem] = await Promise.all([
    loadDesignSystem(),
    announceConfiguration({ path: configurationPath, configStore })
  ])

  app.use(abilitiesPlugin, createMongoAbility([]), { useGlobalProperties: true })

  const gettext = announceGettext({ app, availableLanguages: supportedLanguages })

  const clientService = announceClientService({ app, configStore, authStore })
  announceAuthService({
    app,
    configStore,
    router,
    userStore,
    authStore,
    capabilityStore,
    webWorkersStore
  })

  const appProviderService = announceAppProviderService({
    app,
    serverUrl: configStore.serverUrl,
    clientService
  })

  const federation = new ModuleFederation({ name: 'opencloud-web', remotes: [] })
  registerSharedModules(federation)
  announceLoadingService({ app })

  const [coreTranslations, customTranslations] = await Promise.all([
    loadTranslations(),
    loadCustomTranslations({ configStore }),
    announceTheme({ app, designSystem, configStore }),
    initializeApplications({
      federation,
      app,
      configStore,
      router,
      appProviderService
    }),
    announceCapabilities({ capabilityStore, clientService }),
    authStore.loadWebfingerDiscoveryData(configStore.serverUrl, clientService.httpUnAuthenticated),
    ...(configStore.apps.includes('external') ? [appProviderService.loadData()] : [])
  ])

  // Important: has to happen AFTER native applications are loaded.
  // Reason: the `external` app serves as a blueprint for creating the app provider apps.
  if (applicationStore.has('web-app-external')) {
    await initializeApplications({
      federation,
      app,
      configStore,
      router,
      appProviderService,
      appProviderApps: true
    })
  }

  announceArchiverService({ app, configStore, userStore, capabilityStore })
  announcePreviewService({
    app,
    configStore,
    userStore,
    authStore
  })
  announcePasswordPolicyService({ app })
  announceUppyService({ app })
  announceTranslations({ appsStore, gettext, coreTranslations, customTranslations })
  startSentry(configStore, app)
  announceCustomStyles({ configStore })
  announceCustomScripts({ configStore })
  announceDefaults({ appsStore, router, extensionRegistry, configStore })

  extensionRegistry.registerExtensionPoints(extensionPoints())
  extensionRegistry.registerExtensions(extensions())

  app.use(router)
  app.mount('#opencloud')

  setViewOptions({ resourcesStore })

  const applications = Array.from(applicationStore.values())
  applications.forEach((application) => application.mounted(app))

  watch(
    () =>
      authStore.userContextReady || authStore.idpContextReady || authStore.publicLinkContextReady,
    async (newValue, oldValue) => {
      if (!newValue || newValue === oldValue) {
        return
      }
      announceVersions({ capabilityStore })
      announceUpdates({ updatesStore, capabilityStore, configStore, clientService })

      await announceApplicationsReady({
        app,
        appsStore,
        applications
      })
      appsReadyCallback()
    },
    {
      immediate: true
    }
  )

  watch(
    () => authStore.userContextReady,
    async (userContextReady) => {
      if (!userContextReady) {
        return
      }

      const clientService = app.config.globalProperties.$clientService

      const [graphRoleDefinitions] = await Promise.all([
        clientService.graphAuthenticated.permissions.listRoleDefinitions(),
        spacesStore.loadSpaces({ graphClient: clientService.graphAuthenticated }),
        announceConfiguration({
          path: configurationPath,
          configStore,
          token: authStore.accessToken
        }),
        announceGroupware({
          clientService,
          configStore,
          capabilityStore,
          groupwareConfigStore
        })
      ])

      const previewService = app.config.globalProperties.$previewService
      const passwordPolicyService = app.config.globalProperties.passwordPolicyService
      passwordPolicyService.initialize(capabilityStore)

      // Register SSE event listeners
      if (capabilityStore.supportSSE) {
        registerSSEEventListeners({
          language: gettext,
          resourcesStore,
          spacesStore,
          messageStore: messagesStore,
          sharesStore,
          clientService,
          userStore,
          previewService,
          configStore,
          authStore,
          router
        })
      }

      sharesStore.setGraphRoles(graphRoleDefinitions)
      const personalSpace = spacesStore.spaces.find((s) => s.driveType === 'personal')
      if (personalSpace) {
        spacesStore.updateSpaceField({
          id: personalSpace.id,
          field: 'name',
          value: app.config.globalProperties.$gettext('Personal')
        })
      }
      spacesStore.setSpacesInitialized(true)
    },
    {
      immediate: true
    }
  )
  watch(
    () => authStore.publicLinkContextReady,
    async (publicLinkContextReady) => {
      if (!publicLinkContextReady) {
        return
      }
      // Create virtual space for public link
      const publicLinkToken = authStore.publicLinkToken
      const publicLinkPassword = authStore.publicLinkPassword
      const publicLinkType = authStore.publicLinkType
      const publicLinkName =
        publicLinkType === 'ocm'
          ? app.config.globalProperties.$gettext('OCM share')
          : app.config.globalProperties.$gettext('Public files')

      const { buildPublicSpaceResource } = await import('@opencloud-eu/web-client')
      const space = buildPublicSpaceResource({
        id: publicLinkToken,
        name: publicLinkName,
        ...(publicLinkPassword && { publicLinkPassword }),
        serverUrl: configStore.serverUrl,
        publicLinkType: publicLinkType
      })

      spacesStore.addSpaces([space])
      spacesStore.setSpacesInitialized(true)
    },
    {
      immediate: true
    }
  )
  watch(
    // only needed if a public link gets re-resolved with a changed password prop (changed or removed).
    // don't need to set { immediate: true } on the watcher.
    () => authStore.publicLinkPassword,
    (publicLinkPassword: string | undefined) => {
      const publicLinkToken = authStore.publicLinkToken
      const space = spacesStore.spaces.find((space) => {
        return space.driveType === 'public' && space.id === publicLinkToken
      })
      if (!space) {
        return
      }
      ;(space as PublicSpaceResource).publicLinkPassword = publicLinkPassword
    }
  )
}

export const bootstrapErrorApp = async (err: Error): Promise<void> => {
  const { capabilityStore, configStore } = announcePiniaStores()
  announceVersions({ capabilityStore })
  const app = createApp(pages.failure)
  const designSystem = await loadDesignSystem()
  try {
    await announceTheme({ app, designSystem, configStore })
  } catch (e) {}

  console.error(err)
  const translations = await loadTranslations()
  const gettext = announceGettext({ app, availableLanguages: supportedLanguages })
  announceTranslations({ gettext, coreTranslations: translations })
  app.mount('#opencloud')
}
;(window as any).runtimeLoaded({
  bootstrapApp,
  bootstrapErrorApp
})
