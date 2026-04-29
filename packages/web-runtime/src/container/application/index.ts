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
import * as webPkg from '@opencloud-eu/web-pkg'
import * as webPkgEditor from '@opencloud-eu/web-pkg/editor'
import * as webClient from '@opencloud-eu/web-client'
import * as webClientGraph from '@opencloud-eu/web-client/graph'
import * as webClientGraphGenerated from '@opencloud-eu/web-client/graph/generated'
import * as webClientOcs from '@opencloud-eu/web-client/ocs'
import * as webClientSse from '@opencloud-eu/web-client/sse'
import * as webClientWebdav from '@opencloud-eu/web-client/webdav'

import type { ModuleFederation } from '@module-federation/runtime'
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
  '@opencloud-eu/web-pkg': webPkg,
  '@opencloud-eu/web-pkg/editor': webPkgEditor,
  '@opencloud-eu/web-client': webClient,
  '@opencloud-eu/web-client/graph': webClientGraph,
  '@opencloud-eu/web-client/graph/generated': webClientGraphGenerated,
  '@opencloud-eu/web-client/ocs': webClientOcs,
  '@opencloud-eu/web-client/sse': webClientSse,
  '@opencloud-eu/web-client/webdav': webClientWebdav
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
  federation.registerShared(shared)
}

const loadScriptDynamicImport = async <T>(moduleUri: string) => {
  return ((await import(/* @vite-ignore */ moduleUri)) as any).default as T
}

const loadScriptModuleFederation = async <T>(
  federation: ModuleFederation,
  remoteUrl: string
): Promise<T> => {
  federation.registerRemotes([{ name: remoteUrl, entry: remoteUrl, type: 'module' }])
  const module = await federation.loadRemote(remoteUrl)
  return (module as any).default as T
}

export const loadApplication = async ({
  federation,
  appName,
  applicationKey,
  applicationPath,
  applicationConfig,
  configStore
}: {
  federation: ModuleFederation
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
  try {
    if (applicationPath.includes('/')) {
      if (
        !applicationPath.startsWith('http://') &&
        !applicationPath.startsWith('https://') &&
        !applicationPath.startsWith('//')
      ) {
        applicationPath = urlJoin(configStore.serverUrl, applicationPath)
      }

      if (applicationPath.endsWith('.mjs')) {
        applicationScript = await loadScriptModuleFederation<ClassicApplicationScript>(
          federation,
          applicationPath
        )
      } else {
        throw new RuntimeError(
          'cannot load application as applicationPath is not a valid module federation remote entry'
        )
      }
    } else {
      const productionModule = window.WEB_APPS_MAP?.[applicationPath]
      if (productionModule) {
        applicationScript =
          await loadScriptDynamicImport<ClassicApplicationScript>(productionModule)
      } else {
        throw new RuntimeError(
          'cannot load application as only a name (and no path) is given and that name is not known to the application import map'
        )
      }
    }
  } catch (e) {
    console.trace(e)
    throw new RuntimeError('cannot load application', applicationPath, e)
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
