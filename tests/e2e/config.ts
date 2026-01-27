import { config as jsConfig } from './config.js'

interface Config {
  assets: string
  tempAssetsPath: string
  baseUrlOpenCloud: string
  basicAuth: boolean

  keycloak: boolean
  keycloakHost: string
  keycloakRealm: string
  keycloakAdminUser: string
  keycloakAdminPassword: string
  readonly keycloakUrl: string
  readonly keycloakLoginUrl: string

  federatedbaseUrlOpenCloud: string
  federatedServer: boolean
  readonly baseUrl: string

  debug: boolean
  logLevel: string

  retry: string | number
  parallel: number

  slowMo: number
  timeout: number
  readonly largeUploadTimeout: number
  minTimeout: number
  tokenTimeout: number
  headless: boolean
  acceptDownloads: boolean
  browser: string
  reportDir: string
  readonly tracingReportDir: string
  reportVideo: boolean
  reportHar: boolean
  reportTracing: boolean
  failOnUncaughtConsoleError: boolean
}

// re-export js config as ts config to please typescript compiler.
// otherwhise we would need to ignore all config imports in ts files.
const config = jsConfig as Config

export { config }
