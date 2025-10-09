import { Page } from '@playwright/test'

const sharesNavSelector = '//a[@data-nav-name="files-shares"]'
const sharesWithOthersTabSelector = 'a[href="/files/shares/with-others"]'

export class WithOthers {
  #page: Page

  constructor({ page }: { page: Page }) {
    this.#page = page
  }

  async navigate(): Promise<void> {
    await this.#page.locator(sharesNavSelector).click()
    await this.#page.locator(sharesWithOthersTabSelector).click()
  }
}
