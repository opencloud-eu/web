import { Browser } from '@playwright/test'

export interface ActorsOptions {
  browser: Browser
  context: {
    acceptDownloads: boolean
    failOnUncaughtConsoleError: boolean
  }
}

export interface ActorOptions extends ActorsOptions {
  id: string
  namespace: string
}
