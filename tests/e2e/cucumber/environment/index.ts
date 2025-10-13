import {
  Before,
  BeforeAll,
  setDefaultTimeout,
  setWorldConstructor,
  ITestCaseHookParameter,
  AfterAll,
  After,
  Status
} from '@cucumber/cucumber'
import pino from 'pino'
import { Browser, chromium, firefox, webkit } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

import { World } from './world'
import { state } from './shared'
import { config } from '../../config'
import { Group, User } from '../../support/types'
import { api, environment, utils, store } from '../../support'

export { World }

const logger = pino({
  level: config.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
})

setDefaultTimeout(config.debug ? -1 : config.timeout * 1000)
setWorldConstructor(World)

Before(async function (this: World, { pickle }: ITestCaseHookParameter) {
  this.feature = pickle
  this.actorsEnvironment.on('console', (actorId, message): void => {
    const msg = {
      actor: actorId,
      text: message.text(),
      type: message.type(),
      args: message.args(),
      location: message.location()
    }

    switch (message.type()) {
      case 'debug':
        logger.debug(msg)
        break
      case 'info':
        logger.info(msg)
        break
      case 'error':
        logger.error(msg)
        break
      case 'warning':
        logger.warn(msg)
        break
    }
  })

  if (!config.basicAuth) {
    const user = this.usersEnvironment.getUser({ key: 'admin' })
    if (config.keycloak) {
      await api.keycloak.setAccessTokenForKeycloakOpenCloudUser(user)
      await api.keycloak.setKeycloakAdminAccessToken()
    } else {
      await api.token.setAccessAndRefreshToken(user)
      if (isOcm(pickle)) {
        config.federatedServer = true
        // need to set tokens for federated OpenCloud admin
        await api.token.setAccessAndRefreshToken(user)
        config.federatedServer = false
      }
    }
  }
  this.uniquePrefix = uuidv4().substring(0, 3)
  this.a11yEnabled = pickle.tags.some((tag) => tag.name === '@a11y')
})

BeforeAll(async (): Promise<void> => {
  const browserType = config.browser ?? 'chromium'
  const headless = config.headless
  const slowMo = config.slowMo

  const chromiumArgs = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']

  const browsers: Record<string, () => Promise<Browser>> = {
    firefox: async () =>
      await firefox.launch({
        headless,
        slowMo,
        firefoxUserPrefs: {
          'media.navigator.streams.fake': true,
          'media.navigator.permission.disabled': true
        }
      }),

    webkit: async () =>
      await webkit.launch({
        headless,
        slowMo
      }),

    chrome: async () =>
      await chromium.launch({
        headless,
        slowMo,
        channel: 'chrome',
        args: chromiumArgs
      }),

    chromium: async () =>
      await chromium.launch({
        headless,
        slowMo,
        args: chromiumArgs
      }),

    // Android Pixel 5 - Chromium
    'mobile-chromium': async () =>
      await chromium.launch({
        headless,
        slowMo,
        args: chromiumArgs
      }),

    // iPhone 12 - Safari/WebKit
    'mobile-webkit': async () =>
      await webkit.launch({
        headless,
        slowMo
      }),

    // iPad Pro 11 Portrait - Chromium
    'ipad-chromium': async () =>
      await chromium.launch({
        headless,
        slowMo,
        args: chromiumArgs
      }),

    // iPad Pro 11 Landscape - Safari/WebKit
    'ipad-landscape-webkit': async () =>
      await webkit.launch({
        headless,
        slowMo
      })
  }

  if (!(browserType in browsers)) {
    throw new Error(`Unknown browser: ${browserType}`)
  }

  state.browser = await browsers[browserType]()
})

const defaults = {
  reportHar: config.reportHar,
  reportTracing: config.reportTracing
}

After(async function (this: World, { result, willBeRetried, pickle }: ITestCaseHookParameter) {
  config.federatedServer = false
  if (!result) {
    return
  }

  await this.actorsEnvironment.close()

  // refresh keycloak admin access token
  if (config.keycloak) {
    const user = this.usersEnvironment.getUser({ key: 'admin' })
    await api.keycloak.refreshKeycloakAdminAccessToken()
    await api.keycloak.refreshAccessTokenForKeycloakOpenCloudUser(user)
  }

  if (isOcm(pickle)) {
    // need to set federatedServer config to true to delete federated OpenCloud users
    config.federatedServer = true
    await cleanUpUser(store.federatedUserStore, this.usersEnvironment.getUser({ key: 'admin' }))
    config.federatedServer = false
  }
  await cleanUpUser(store.createdUserStore, this.usersEnvironment.getUser({ key: 'admin' }))
  await cleanUpSpaces(this.usersEnvironment.getUser({ key: 'admin' }))
  await cleanUpGroup(this.usersEnvironment.getUser({ key: 'admin' }))

  store.createdLinkStore.clear()
  store.createdTokenStore.clear()
  store.federatedTokenStore.clear()
  store.keycloakTokenStore.clear()
  utils.removeTempUploadDirectory()
  environment.closeSSEConnections()

  if (fs.existsSync(config.tracingReportDir)) {
    filterTracingReports(result.status)
  }

  // NOTE: config should be changed at the very end of the test
  config.reportHar = willBeRetried || defaults.reportHar
  config.reportTracing = willBeRetried || defaults.reportTracing
})

AfterAll(async () => {
  environment.closeSSEConnections()

  if (state.browser) {
    await state.browser.close()
  }

  // move failed tracing reports
  const failedDir = path.dirname(config.tracingReportDir) + '/failed'
  if (fs.existsSync(failedDir)) {
    fs.mkdirSync(config.tracingReportDir, { recursive: true })
    fs.readdirSync(failedDir).forEach((file) => {
      fs.renameSync(failedDir + '/' + file, config.tracingReportDir + '/' + file)
    })
    fs.rmSync(failedDir, { recursive: true })
  }
})

function filterTracingReports(status: string) {
  const traceDir = config.tracingReportDir
  const failedDir = path.dirname(config.tracingReportDir) + '/failed'

  if (status !== Status.PASSED) {
    if (!fs.existsSync(failedDir)) {
      fs.mkdirSync(failedDir, { recursive: true })
    }
    const reports = fs.readdirSync(traceDir)
    // collect tracings for failed tests
    reports.forEach((report) => {
      fs.renameSync(`${traceDir}/${report}`, `${failedDir}/${report}`)
    })
  } else if (!defaults.reportTracing) {
    // clean up the tracing directory if the report tracing was not set explicitly
    fs.rmSync(traceDir, { recursive: true })
  }
}

const cleanUpUser = async (createdUserStore: Map<string, User>, adminUser: User) => {
  const requests: Promise<User>[] = []
  createdUserStore.forEach((user) => {
    if (config.keycloak) {
      requests.push(api.keycloak.deleteUser({ user }))
    } else {
      requests.push(api.graph.deleteUser({ user, admin: adminUser }))
    }
  })
  await Promise.all(requests)
  createdUserStore.clear()
}

const cleanUpSpaces = async (adminUser: User) => {
  const requests: Promise<void>[] = []
  store.createdSpaceStore.forEach((space) => {
    requests.push(
      api.graph
        .disableSpace({
          user: adminUser,
          space
        })
        .then(async (res) => {
          if (res.status() === 204) {
            await api.graph.deleteSpace({
              user: adminUser,
              space
            })
          }
        })
    )
  })
  await Promise.all(requests)
  store.createdSpaceStore.clear()
}

const cleanUpGroup = async (adminUser: User) => {
  const requests: Promise<Group>[] = []
  store.createdGroupStore.forEach((group) => {
    if (config.keycloak) {
      requests.push(api.keycloak.deleteGroup({ group }))
    } else {
      requests.push(api.graph.deleteGroup({ group, admin: adminUser }))
    }
  })

  await Promise.all(requests)
  store.createdGroupStore.clear()
}

const isOcm = (pickle: ITestCaseHookParameter['pickle']): boolean => {
  const tags = pickle.tags.map((tag) => tag.name)
  if (tags.includes('@ocm')) {
    return true
  }
  return false
}
