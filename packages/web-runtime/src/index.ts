import { loadDesignSystem, pages, loadTranslations, supportedLanguages } from './defaults'
import { router } from './router'
import { createHead } from '@vueuse/head'
import { abilitiesPlugin } from '@casl/vue'
import { createMongoAbility } from '@casl/ability'

import {
  announceConfiguration,
  initializeApplications,
  announceApplicationsReady,
  announceAuthClient,
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
  announceGroupware
} from './container/bootstrap'
import { applicationStore } from './container/store'
import {
  buildPublicSpaceResource,
  isPersonalSpaceResource,
  isPublicSpaceResource,
  PublicSpaceResource
} from '@opencloud-eu/web-client'
import { loadCustomTranslations } from './helpers/customTranslations'
import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import Avatar from './components/Avatar.vue'
import { extensionPoints } from './extensionPoints'
import { isSilentRedirectRoute } from './helpers/silentRedirect'
import { extensions } from './extensions'
import { UnifiedRoleDefinition } from '@opencloud-eu/web-client/graph/generated'

export const bootstrapApp = async (configurationPath: string, appsReadyCallback: () => void) => {
  const isSilentRedirect = isSilentRedirectRoute()

  const pinia = createPinia()
  const app = createApp(isSilentRedirect ? pages.tokenRenewal : pages.success)
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

  extensionRegistry.registerExtensionPoints(extensionPoints())

  app.provide('$router', router)

  await announceConfiguration({ path: configurationPath, configStore })

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

  if (!isSilentRedirect) {
    const designSystem = await loadDesignSystem()

    announceUppyService({ app })
    startSentry(configStore, app)
    const appProviderService = announceAppProviderService({
      app,
      serverUrl: configStore.serverUrl,
      clientService
    })
    announceArchiverService({ app, configStore, userStore, capabilityStore })
    announceLoadingService({ app })
    announcePreviewService({
      app,
      configStore,
      userStore,
      authStore
    })
    announcePasswordPolicyService({ app })
    await announceAuthClient(configStore)

    const applicationsPromise = initializeApplications({
      app,
      configStore,
      router,
      appProviderService
    })
    const translationsPromise = loadTranslations()
    const customTranslationsPromise = loadCustomTranslations({ configStore })
    const themePromise = announceTheme({ app, designSystem, configStore })
    const [coreTranslations, customTranslations] = await Promise.all([
      translationsPromise,
      customTranslationsPromise,
      applicationsPromise,
      themePromise
    ])

    // Important: has to happen AFTER native applications are loaded.
    // Reason: the `external` app serves as a blueprint for creating the app provider apps.
    if (applicationStore.has('web-app-external')) {
      await appProviderService.loadData()
      await initializeApplications({
        app,
        configStore,
        router,
        appProviderService,
        appProviderApps: true
      })
    }

    announceTranslations({ appsStore, gettext, coreTranslations, customTranslations })

    announceCustomStyles({ configStore })
    announceCustomScripts({ configStore })
    announceDefaults({ appsStore, router, extensionRegistry, configStore })

    extensionRegistry.registerExtensions(extensions())
  }

  app.use(router)
  app.use(createHead())

  app.component('AvatarImage', Avatar)

  app.mount('#opencloud')

  if (isSilentRedirect) {
    return
  }

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
          router
        })
      }

      sharesStore.setGraphRoles(graphRoleDefinitions as UnifiedRoleDefinition[])
      const personalSpace = spacesStore.spaces.find(isPersonalSpaceResource)
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
    (publicLinkContextReady) => {
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
        return isPublicSpaceResource(space) && space.id === publicLinkToken
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
