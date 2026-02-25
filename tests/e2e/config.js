const withHttp = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)

// keep in sync with the type in config.ts
export const config = {
  // environment
  assets: './tests/e2e/filesForUpload',
  tempAssetsPath: './tests/e2e/filesForUpload/temp',
  baseUrlOpenCloud: process.env.OC_BASE_URL ?? 'host.docker.internal:9200',
  basicAuth: process.env.BASIC_AUTH === 'true',
  // keycloak config
  keycloak: process.env.KEYCLOAK === 'true',
  keycloakHost: process.env.KEYCLOAK_HOST ?? 'keycloak.opencloud.test',
  keycloakRealm: process.env.KEYCLOAK_REALM ?? 'openCloud',
  keycloakAdminUser: process.env.KEYCLOAK_ADMIN_USER ?? 'admin',
  keycloakAdminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin',
  get keycloakUrl() {
    return withHttp(this.keycloakHost)
  },
  get keycloakLoginUrl() {
    return withHttp(this.keycloakHost + '/admin/master/console')
  },
  // ocm config
  federatedbaseUrlOpenCloud: process.env.OC_FEDERATED_BASE_URL ?? 'federation-opencloud:10200',
  federatedServer: false,
  get baseUrl() {
    return withHttp(this.federatedServer ? this.federatedbaseUrlOpenCloud : this.baseUrlOpenCloud)
  },
  debug: process.env.DEBUG === 'true',
  logLevel: process.env.LOG_LEVEL || 'silent',
  // cucumber
  retry: process.env.RETRY || 0,
  parallel: parseInt(process.env.PARALLEL) || 1,
  // playwright
  slowMo: parseInt(process.env.SLOW_MO) || 0,
  // timeout for a whole test scenario
  testTimeout: parseInt(process.env.TEST_TIMEOUT) || 120,
  // timeout used for test actions
  get timeout() {
    return this.testTimeout / 2
  },
  // double the timeout for large file uploads
  get largeUploadTimeout() {
    return this.testTimeout * 2
  },
  minTimeout: parseInt(process.env.MIN_TIMEOUT) || 5,
  tokenTimeout: parseInt(process.env.TOKEN_TIMEOUT) || 40,
  headless: process.env.HEADLESS === 'true',
  acceptDownloads: process.env.DOWNLOADS !== 'false',
  browser: process.env.BROWSER ?? 'chromium',
  reportDir: process.env.REPORT_DIR || 'reports/e2e',
  get tracingReportDir() {
    return this.reportDir + '/playwright/tracing'
  },
  reportVideo: process.env.REPORT_VIDEO === 'true',
  reportHar: process.env.REPORT_HAR === 'true',
  reportTracing: process.env.REPORT_TRACING === 'true',
  failOnUncaughtConsoleError: process.env.FAIL_ON_UNCAUGHT_CONSOLE_ERR === 'true'
}
