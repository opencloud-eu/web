import { Page } from '@playwright/test'

const sharesNavSelector = '//a[@data-nav-name="files-shares"]'
const sharesViaLinkTabSelector = 'a[href="/files/shares/via-link"]'

export class ViaLink {
  #page: Page

  constructor({ page }: { page: Page }) {
    this.#page = page
  }

  async navigate(): Promise<void> {
    await this.#page.locator(sharesNavSelector).click()
    await this.#page.locator(sharesViaLinkTabSelector).click()
  }
}
