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
import * as webClient from '@opencloud-eu/web-client'
import * as webClientGraph from '@opencloud-eu/web-client/graph'
import * as webClientGraphGenerated from '@opencloud-eu/web-client/graph/generated'
import * as webClientOcs from '@opencloud-eu/web-client/ocs'
import * as webClientSse from '@opencloud-eu/web-client/sse'
import * as webClientWebdav from '@opencloud-eu/web-client/webdav'

import { urlJoin } from '@opencloud-eu/web-client'
import { App } from 'vue'
import { AppConfigObject, ClassicApplicationScript } from '@opencloud-eu/web-pkg'

export { NextApplication } from './next'

// shim requirejs, trust me it's there... :
const { requirejs, define } = window as any

// register modules with requirejs to provide them to applications
// keep in sync with packages/extension-sdk/index.mjs
const injectionMap = {
  luxon,
  pinia,
  vue,
  'vue3-gettext': vueGettext,
  '@opencloud-eu/web-pkg': webPkg,
  '@opencloud-eu/web-client': webClient,
  '@opencloud-eu/web-client/graph': webClientGraph,
  '@opencloud-eu/web-client/graph/generated': webClientGraphGenerated,
  '@opencloud-eu/web-client/ocs': webClientOcs,
  '@opencloud-eu/web-client/sse': webClientSse,
  '@opencloud-eu/web-client/webdav': webClientWebdav,
  'web-pkg': webPkg,
  'web-client': webClient
}

for (const [key, value] of Object.entries(injectionMap)) {
  define(key, () => value)
}

const loadScriptDynamicImport = async <T>(moduleUri: string) => {
  return ((await import(/* @vite-ignore */ moduleUri)) as any).default as T
}

const loadScriptRequireJS = <T>(moduleUri: string) => {
  return new Promise<T>((resolve, reject) =>
    requirejs(
      [moduleUri],
      (app: T) => resolve(app),
      (err: Error) => reject(err)
    )
  )
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
  try {
    if (applicationPath.includes('/')) {
      if (
        !applicationPath.startsWith('http://') &&
        !applicationPath.startsWith('https://') &&
        !applicationPath.startsWith('//')
      ) {
        applicationPath = urlJoin(configStore.serverUrl, applicationPath)
      }

      if (applicationPath.endsWith('.mjs') || applicationPath.endsWith('.ts')) {
        applicationScript = await loadScriptDynamicImport<ClassicApplicationScript>(applicationPath)
      } else {
        applicationScript = await loadScriptRequireJS<ClassicApplicationScript>(applicationPath)
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
