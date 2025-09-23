import { Locator, Page } from '@playwright/test'
import * as po from './actions'

export class Account {
  #page: Page

  constructor({ page }: { page: Page }) {
    this.#page = page
  }

  getQuotaValue(): Promise<string> {
    return po.getQuotaValue({ page: this.#page })
  }

  getUserInfo(key: string): Promise<string> {
    return po.getUserInfo({ page: this.#page, key })
  }

  async openAccountPage(): Promise<void> {
    await po.openAccountPage({ page: this.#page })
  }

  async openAccountSubPage(subPage: string): Promise<void> {
    await po.openAccountSubPage({ page: this.#page, subPage })
  }

  async requestGdprExport(): Promise<void> {
    await po.requestGdprExport({ page: this.#page })
  }

  downloadGdprExport(): Promise<string> {
    return po.downloadGdprExport({ page: this.#page })
  }

  async changeLanguage(language: string, isAnonymousUser = false): Promise<void> {
    await po.changeLanguage({ page: this.#page, language, isAnonymousUser })
  }

  getTitle(): Promise<string> {
    return po.getTitle({ page: this.#page })
  }

  async uploadProfileImage({ path }: { path: string }): Promise<void> {
    await po.uploadProfileImage(path, this.#page)
  }

  async deleteProfileImage(): Promise<void> {
    await po.deleteProfilePicture({ page: this.#page })
  }

  async getProfilePicture(): Promise<Locator> {
    return await po.getProfilePicture({ page: this.#page })
  }
}
