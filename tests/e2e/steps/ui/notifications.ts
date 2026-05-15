import { When, Then } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { expect } from '@playwright/test'

Then(
  '{string} should see the following notification(s)',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const application = new objects.runtime.Application({ page })
    const messages = await application.getNotificationMessages()
    for (const { message } of stepTable.hashes()) {
      expect(messages).toContain(message)
    }
  }
)

Then(
  '{string} should see no notification(s)',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const application = new objects.runtime.Application({ page })
    const messages = await application.getNotificationMessages()
    expect(messages.length).toBe(0)
  }
)

When(
  '{string} marks all notifications as read',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const application = new objects.runtime.Application({ page })
    await application.markNotificationsAsRead()
  }
)

Then(
  '{string} should see sharer avatar in the notification',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const application = new objects.runtime.Application({ page })
    const avatarLocator = await application.getSharerAvatarFromNotification()
    await expect(avatarLocator).toBeVisible()
  }
)

Then(
  '{string} opens notifications dropdown',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const application = new objects.runtime.Application({ page })
    await application.getNotificationMessages()
  }
)
