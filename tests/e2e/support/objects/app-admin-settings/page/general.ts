import { expect, Locator, Page } from '@playwright/test'

const bannerTextInput = '#announcement-banner-text'
const bannerDetailsEditor = '.text-editor-content [contenteditable="true"]'
const showBannerSwitch = '[data-testid="oc-switch-btn"]'
const saveButton = '//button[normalize-space()="Save"]'
const announcementBanner = '.announcement'
const announcementBannerButton = '.announcement button[aria-haspopup="dialog"]'
const announcementDismissButton = '.announcement button[aria-label="Dismiss announcement"]'
const announcementModal = '.oc-modal .announcement-modal'
const announcementModalCloseButton = '.oc-modal .oc-modal-body-actions-confirm'

export class General {
  #page: Page

  constructor({ page }: { page: Page }) {
    this.#page = page
  }

  async navigate(): Promise<void> {
    await this.#page.locator('//a[@data-nav-name="admin-settings-general"]').click()
    await this.#page.locator('#app-loading-spinner').waitFor({ state: 'detached' })
  }

  async saveAnnouncementBanner({
    bannerText,
    details
  }: {
    bannerText: string
    details: string
  }): Promise<void> {
    await this.#page.locator(bannerTextInput).fill(bannerText)
    const editor = this.#page.locator(bannerDetailsEditor)
    await editor.click()
    await editor.pressSequentially(details)
    await Promise.all([
      this.#page.waitForResponse(
        (res) => res.request().method() === 'PUT' && res.url().includes('announcement')
      ),
      this.#page.locator(saveButton).click()
    ])
  }

  async setShowBanner({ enabled }: { enabled: boolean }): Promise<void> {
    const switchButton = this.#page.locator(showBannerSwitch)
    await expect(switchButton).toBeEnabled()
    const isChecked = (await switchButton.getAttribute('aria-checked')) === 'true'
    if (isChecked === enabled) {
      return
    }
    await Promise.all([
      this.#page.waitForResponse(
        (res) => res.request().method() === 'PUT' && res.url().includes('announcement')
      ),
      switchButton.click()
    ])
    await expect(switchButton).toHaveAttribute('aria-checked', String(enabled))
  }

  getAnnouncementBanner(): Locator {
    return this.#page.locator(announcementBanner)
  }

  async openAnnouncementBannerDetails(): Promise<void> {
    await this.#page.locator(announcementBannerButton).click()
    await expect(this.#page.locator(announcementModal)).toBeVisible()
  }

  async expectAnnouncementBannerDetails({ text }: { text: string }): Promise<void> {
    await expect(this.#page.locator(announcementModal)).toContainText(text)
  }

  async closeAnnouncementBannerDetails(): Promise<void> {
    await this.#page.locator(announcementModalCloseButton).click()
    await expect(this.#page.locator(announcementModal)).toBeHidden()
  }

  async dismissAnnouncementBanner(): Promise<void> {
    await this.#page.locator(announcementDismissButton).click()
    await expect(this.#page.locator(announcementBanner)).toBeHidden()
  }
}
