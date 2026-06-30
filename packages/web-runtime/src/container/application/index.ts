import { Router } from 'vue-router'
import { NextApplication } from './next'
import { convertClassicApplication } from './classic'
import { RuntimeError, ConfigStore } from '@opencloud-eu/web-pkg'
import { applicationStore } from '../store'
import { isObject } from 'lodash-es'

// import modules to provide them to applications
import * as vue from 'vue'
import * as luxon from 'luxon'
import * as vueGettext from 'vue3-gettext'
import * as pinia from 'pinia'
import * as webClient from '@opencloud-eu/web-client'
import * as webClientGraph from '@opencloud-eu/web-client/graph'
import * as webClientGraphGenerated from '@opencloud-eu/web-client/graph/generated'
import * as webClientOcs from '@opencloud-eu/web-client/ocs'
import * as webClientOx from '@opencloud-eu/web-client/ox'
import * as webClientSse from '@opencloud-eu/web-client/sse'
import * as webClientWebdav from '@opencloud-eu/web-client/webdav'

import { ModuleFederation } from '@module-federation/runtime'
import { urlJoin } from '@opencloud-eu/web-client'
import { App } from 'vue'
import { AppConfigObject, ClassicApplicationScript } from '@opencloud-eu/web-pkg'

export { NextApplication } from './next'

// Shared modules provided to external apps via Module Federation.
// Must match externalModules in packages/extension-sdk/externalModules.mjs — verified by unit test.
export const sharedModules: Record<string, unknown> = {
  vue,
  luxon,
  pinia,
  'vue3-gettext': vueGettext,
  '@opencloud-eu/web-client': webClient,
  '@opencloud-eu/web-client/graph': webClientGraph,
  '@opencloud-eu/web-client/graph/generated': webClientGraphGenerated,
  '@opencloud-eu/web-client/ocs': webClientOcs,
  '@opencloud-eu/web-client/ox': webClientOx,
  '@opencloud-eu/web-client/sse': webClientSse,
  '@opencloud-eu/web-client/webdav': webClientWebdav
}

// Lazily loaded shared modules - not bundled in the initial chunks.
export const lazySharedModules: Record<string, () => Promise<unknown>> = {
  '@opencloud-eu/web-pkg': () => import('@opencloud-eu/web-pkg'),
  '@opencloud-eu/web-pkg/editor': () => import('@opencloud-eu/web-pkg/editor')
}

/**
 * Register shared modules with Module Federation.
 * Called once during bootstrap before any applications are loaded.
 */
export function registerSharedModules(federation: ModuleFederation) {
  const shared: Record<
    string,
    { version: string; scope: string[]; get: () => Promise<() => unknown> }
  > = {}
  for (const [key, value] of Object.entries(sharedModules)) {
    shared[key] = {
      version: '0.0.0',
      scope: ['default'],
      get: () => Promise.resolve(() => value)
    }
  }
  for (const [key, loader] of Object.entries(lazySharedModules)) {
    shared[key] = {
      version: '0.0.0',
      scope: ['default'],
      get: () => loader().then((m) => () => m)
    }
  }
  federation.registerShared(shared)
}

const loadScriptDynamicImport = async <T>(moduleUri: string) => {
  return ((await import(/* @vite-ignore */ moduleUri)) as any).default as T
}

const loadScriptModuleFederation = async <T>(remoteUrl: string, name: string): Promise<T> => {
  // Each remote gets its own Module Federation instance with an isolated shared scope.
  // All remotes loaded through a single instance share the same `shareScopeMap` by
  // reference, so a faulty app that corrupts that scope during init breaks every other
  // app too. Per-instance isolation contains such failures to the offending app.
  // This is cheap: the shared modules are imported once at the top of this file and only
  // referenced here, so creating an instance just registers a handful of lazy descriptors.
  const federation = new ModuleFederation({ name: `opencloud-web-${name}`, remotes: [] })
  registerSharedModules(federation)
  federation.registerRemotes([{ name: remoteUrl, entry: remoteUrl, type: 'module' }])
  const module = await federation.loadRemote(remoteUrl)
  return (module as any).default as T
}

export const loadApplication = async ({
  appName,
  applicationKey,
  applicationPath,
  applicationConfig,
  configStore
}: {
  appName?: string
  applicationKey: string
  applicationPath: string
  applicationConfig: AppConfigObject
  configStore: ConfigStore
}): Promise<{
  appName?: string
  applicationKey: string
  applicationPath: string
  applicationConfig: AppConfigObject
  applicationScript: ClassicApplicationScript
}> => {
  if (applicationStore.has(applicationKey)) {
    throw new RuntimeError('application already announced', applicationKey, applicationPath)
  }

  let applicationScript: ClassicApplicationScript
  if (applicationPath.includes('/')) {
    if (
      !applicationPath.startsWith('http://') &&
      !applicationPath.startsWith('https://') &&
      !applicationPath.startsWith('//')
    ) {
      applicationPath = urlJoin(configStore.serverUrl, applicationPath)
    }

    if (applicationPath.endsWith('.mjs')) {
      try {
        applicationScript = await loadScriptModuleFederation<ClassicApplicationScript>(
          applicationPath,
          applicationKey
        )
      } catch (e) {
        throw new RuntimeError('failed to load application', applicationKey, e)
      }
    } else {
      throw new RuntimeError(
        'cannot load application as applicationPath is not a valid module federation remote entry'
      )
    }
  } else {
    const productionModule = window.WEB_APPS_MAP?.[applicationPath]
    if (productionModule) {
      applicationScript = await loadScriptDynamicImport<ClassicApplicationScript>(productionModule)
    } else {
      throw new RuntimeError(
        'cannot load application as only a name (and no path) is given and that name is not known to the application import map'
      )
    }
  }

  return {
    appName,
    applicationKey,
    applicationPath,
    applicationConfig,
    applicationScript
  }
}

/**
 * sniffs arguments and decides if given manifest is of next or current application style.
 */
export const buildApplication = ({
  app,
  appName,
  applicationKey,
  applicationPath,
  applicationConfig,
  applicationScript,
  router
}: {
  app: App
  appName?: string
  applicationKey: string
  applicationPath: string
  applicationConfig: AppConfigObject
  applicationScript: ClassicApplicationScript
  router: Router
}) => {
  if (applicationStore.has(applicationKey)) {
    throw new RuntimeError('application already announced', applicationKey, applicationPath)
  }

  let application: NextApplication
  try {
    /** add valuable sniffer to detect next applications, then implement next application factory */
    if (!isObject(applicationScript.appInfo) && !applicationScript.setup) {
      throw new RuntimeError('next applications not implemented yet, stay tuned')
    } else {
      application = convertClassicApplication({
        app,
        appName,
        applicationScript,
        applicationConfig,
        router
      })
    }
  } catch (err) {
    throw new RuntimeError('cannot create application', err.message, applicationPath)
  }

  applicationStore.set(applicationKey, application)

  return application
}
