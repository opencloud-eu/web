import { Browser, BrowserContextOptions, devices } from '@playwright/test'
import path from 'path'
import { config } from '../../../config'

export interface ActorsOptions {
  browser: Browser
  context: {
    acceptDownloads: boolean
    reportDir: string
    tracingReportDir: string
    reportVideo: boolean
    reportHar: boolean
    reportTracing: boolean
    failOnUncaughtConsoleError: boolean
  }
}

export interface ActorOptions extends ActorsOptions {
  id: string
  namespace: string
}

export const buildBrowserContextOptions = (options: ActorOptions): BrowserContextOptions => {
  const getPermissions = (browserName: string): string[] => {
    const basePermissions: string[] = []

    // Clipboard permissions supports only in Chromium-based browsers
    if (browserName === 'webkit') {
      return [...basePermissions, 'clipboard-read']
    } else if (['chromium', 'chrome', 'msedge'].includes(browserName)) {
      return [...basePermissions, 'clipboard-read', 'clipboard-write']
    }
    return basePermissions
  }

  const contextOptions: BrowserContextOptions = {
    acceptDownloads: options.context.acceptDownloads,
    permissions: getPermissions(
      options.browser ? options.browser.browserType().name() : 'chromium'
    ),
    ignoreHTTPSErrors: true,
    locale: 'en-US'
  }

  if (options.context.reportVideo) {
    contextOptions.recordVideo = {
      dir: path.join(options.context.reportDir, 'playwright', 'video')
    }
  }

  if (options.context.reportHar) {
    contextOptions.recordHar = {
      path: path.join(options.context.reportDir, 'playwright', 'har', `${options.namespace}.har`)
    }
  }

  switch (config.browser) {
    case 'mobile-chromium':
      Object.assign(contextOptions, devices['Pixel 5'])
      break

    case 'mobile-webkit':
      Object.assign(contextOptions, {
        ...devices['iPhone 12'],
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
      })
      break

    case 'ipad-chromium':
      Object.assign(contextOptions, {
        ...devices['iPad Pro 11'],
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
      })
      break

    case 'ipad-landscape-webkit':
      Object.assign(contextOptions, {
        ...devices['iPad Pro 11 landscape'],
        userAgent:
          'Mozilla/5.0 (iPad; CPU iPad OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
      })
      break

    default:
      break
  }
  return contextOptions
}
