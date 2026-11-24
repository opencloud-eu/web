import { Page, expect } from '@playwright/test'
import { appConfig } from '../../playwright.config'

// closes all notifications, they can also disappear on their own meanwhile
export const closeNotifications = async ({ page }: { page: Page }) => {
  const closeButton = page.locator('.oc-notification-message button')
  await expect(async () => {
    if ((await closeButton.count()) > 0) {
      await closeButton.first().click({ timeout: 1000 })
    }
    expect(await closeButton.count()).toBe(0)
  }).toPass({ intervals: [100], timeout: appConfig.minTimeout * 2 * 1000 })
}
