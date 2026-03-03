import { Page } from '@playwright/test'

// checks if there are any notifications and closes them
export const closeNotifications = async ({ page }: { page: Page }) => {
  const closeButton = page.locator('.oc-notification-message button')
  const count = await closeButton.count()
  for (let i = 0; i < count; i++) {
    await closeButton.nth(i).click()
  }
}
