import { Page } from '@playwright/test'

// checks if there are any notifications and closes them
export const closeNotifications = async ({ page }: { page: Page }) => {
  const closeButton = page.locator('.oc-notification-message button')
  while ((await closeButton.count()) > 0) {
    await closeButton.first().click()
  }
}
