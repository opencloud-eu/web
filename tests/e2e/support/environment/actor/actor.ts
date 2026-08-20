import { BrowserContext, Page, expect } from '@playwright/test'
import EventEmitter from 'events'
import { Actor } from '../../types'
import { ActorOptions } from './shared'

export class ActorEnvironment extends EventEmitter implements Actor {
  private readonly options: ActorOptions
  private currentTabIndex: number
  public context: BrowserContext
  public page: Page
  public tabs: Page[] = []

  constructor(options: ActorOptions) {
    super()
    this.options = options
    this.currentTabIndex = 0
  }

  async setup(): Promise<void> {
    this.context = await this.options.browser.newContext({ ignoreHTTPSErrors: true })

    await this.context.addInitScript(() => {
      ;(window as any).__E2E__ = true
    })

    this.page = await this.context.newPage()
    this.tabs.push(this.page)

    this.page.on('pageerror', (exception) => {
      console.log(`[UNCAUGHT EXCEPTION] "${exception}"`)
      if (this.options.browser.browserType().name() === 'webkit') {
        // Ignore ResizeObserver error in WebKit - it's a harmless warning
        if (exception.message.includes('ResizeObserver')) {
          return
        }
        if (
          exception.message.includes('access control checks') &&
          exception.message.includes('preview=1')
        ) {
          return
        }
      }
      // make the test fail if FAIL_ON_UNCAUGHT_CONSOLE_ERR=true
      if (this.options.context.failOnUncaughtConsoleError) {
        expect(exception).not.toBeDefined()
      }
    })
  }

  public savePage(newPage: Page) {
    const tabsLength = this.tabs.push(newPage)
    // set the new page
    this.page = newPage
    this.currentTabIndex = tabsLength - 1
  }

  public async newTab(): Promise<Page> {
    const page: Page = await this.context.newPage()
    const tabsLength = this.tabs.push(page)
    this.page = page
    this.currentTabIndex = tabsLength - 1
    return page
  }

  public async switchTab(index: number): Promise<Page> {
    index = index - 1
    const page = this.tabs[index]
    if (!page) {
      throw new Error(`No tab found at index ${index}. Open tabs: ${this.tabs.length}`)
    }
    this.page = page
    await page.bringToFront()
    this.currentTabIndex = index
    return page
  }

  public async closeCurrentTab(): Promise<void> {
    await this.page.close()
    this.tabs.splice(this.currentTabIndex, 1)

    if (this.tabs.length === 0) {
      this.page = null
      return
    }
    this.page = this.tabs.at(-1)
  }

  async close(): Promise<void> {
    await this.page?.close()
    await this.context?.close()

    this.emit('closed')
  }
}
