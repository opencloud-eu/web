import { Then, When } from '../../environment/fixtures'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { expect } from '@playwright/test'

Then(
  /^"([^"]*)" (should|should not) see the motion photo badge on resource "([^"]*)"$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    resource: string
  ): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const resourceObject = new objects.applicationFiles.Resource({ page })
    const badgeLocator = resourceObject.getMotionPhotoBadgeLocator(resource)

    actionType === 'should'
      ? await expect(badgeLocator).toBeVisible()
      : await expect(badgeLocator).not.toBeVisible()
  }
)

Then(
  /^"([^"]*)" (should|should not) see the motion photo badge in the media viewer for resource "([^"]*)"$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    resource: string
  ): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const resourceObject = new objects.applicationFiles.Resource({ page })
    const badgeLocator = resourceObject.getPreviewMotionPhotoBadgeLocator(resource)

    actionType === 'should'
      ? await expect(badgeLocator).toBeVisible()
      : await expect(badgeLocator).not.toBeVisible()
  }
)

Then(
  '{string} should see the motion photo control in the media viewer',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const resourceObject = new objects.applicationFiles.Resource({ page })
    // the bundled Chromium cannot decode the H.264 clip, so only the control is asserted
    await expect(resourceObject.getMotionPhotoViewerControlLocator()).toBeVisible()
  }
)

When(
  '{string} plays the motion photo inline from the sidebar for resource {string}',
  async ({ world }: { world: World }, stepUser: string, resource: string): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const resourceObject = new objects.applicationFiles.Resource({ page })
    await resourceObject.openRightSidebar(resource)
    await resourceObject.playMotionPhotoInSidebar()
  }
)

Then(
  '{string} should see the motion photo clip loaded in the sidebar',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const resourceObject = new objects.applicationFiles.Resource({ page })
    await expect
      .poll(() => resourceObject.getSidebarMotionPhotoVideoSource(), { timeout: 15000 })
      .toMatch(/^blob:/)
  }
)
