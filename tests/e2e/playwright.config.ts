import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
const testDir = defineBddConfig({
  featuresRoot: './features',
  steps: ['steps/ui/*.ts', 'steps/*.ts', 'environment/fixtures.ts', 'environment/hooks.ts']
})

const withHttp = (url: string): string => {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

// Disable TLS verification for Node.js (e.g. self-signed certs in test environments)
// needs for @sse tests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export const appConfig = {
  // Basic auth
  basicAuth: process.env.BASIC_AUTH === 'true',

  // Keycloak
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

  // OCM config
  baseUrlOpenCloud: process.env.OC_BASE_URL ?? 'host.docker.internal:9200',
  federatedBaseUrlOpenCloud: process.env.OC_FEDERATED_BASE_URL ?? 'federation-opencloud:10200',
  federatedServer: process.env.FEDERATED_SERVER === 'true' || false,

  get baseUrl() {
    const url = this.federatedServer ? this.federatedBaseUrlOpenCloud : this.baseUrlOpenCloud
    return withHttp(url)
  },

  // Timeouts
  testTimeout: parseInt(process.env.TEST_TIMEOUT || '120'),
  get timeout() {
    return this.testTimeout / 2
  },
  minTimeout: parseInt(process.env.MIN_TIMEOUT || '5'),
  tokenTimeout: parseInt(process.env.TOKEN_TIMEOUT || '40'),
  largeUploadTimeout: parseInt(process.env.LARGE_UPLOAD_TIMEOUT || '240'),

  headless: process.env.HEADLESS === 'true',
  slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
  acceptDownloads: process.env.DOWNLOADS !== 'false',
  assetsPath: 'filesForUpload',
  tempAssetsPath: 'filesForUpload/temp',
  failOnUncaughtConsoleError: process.env.FAIL_ON_UNCAUGHT_CONSOLE_ERROR === 'false' ? false : true
}

export default defineConfig({
  testDir: testDir,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',
    baseURL: appConfig.baseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
    headless: appConfig.headless,
    locale: 'en-US'
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], permissions: ['clipboard-read', 'clipboard-write'] }
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },

    /* Test against mobile viewports. */
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'mobile-webkit',
      use: {
        ...devices['iPhone 12'],
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
      }
    },
    {
      name: 'ipad-chromium',
      use: {
        ...devices['iPad Pro 11'],
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
      }
    },
    {
      name: 'ipad-landscape-webkit',
      use: {
        ...devices['iPad Pro 11 landscape'],
        userAgent:
          'Mozilla/5.0 (iPad; CPU iPad OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
      }
    }

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ]

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
})
