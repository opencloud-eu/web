import { When, Then } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { pageObjectFor } from '../../environment/pageObject'
import { expect } from '@playwright/test'

Then(
  '{string} should have quota {string}',
  async ({ world }: { world: World }, stepUser: string, quota: string): Promise<void> => {
    const accountObject = pageObjectFor(world, stepUser, objects.account.Account)
    expect(await accountObject.getQuotaValue()).toBe(quota)
  }
)

Then(
  '{string} should have self info:',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const accountObject = pageObjectFor(world, stepUser, objects.account.Account)

    for (const info of stepTable.hashes()) {
      const actualText = await accountObject.getUserInfo(info.key)
      // remove unique prefix from group names
      const cleanedText = actualText.replace(/-\w{3,}/g, '')

      expect(cleanedText).toContain(info.value)
    }
  }
)

When(
  '{string} opens the user menu',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const accountObject = pageObjectFor(world, stepUser, objects.account.Account)
    await accountObject.openAccountPage()
  }
)

When(
  '{string} opens {string} on the user menu',
  async ({ world }: { world: World }, stepUser: string, subPage: string): Promise<void> => {
    const accountObject = pageObjectFor(world, stepUser, objects.account.Account)
    await accountObject.openAccountSubPage(subPage)
  }
)

When(
  '{string} requests a new GDPR export',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const accountObject = pageObjectFor(world, stepUser, objects.account.Account)
    await accountObject.requestGdprExport()
  }
)

When(
  '{string} downloads the GDPR export',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const accountObject = pageObjectFor(world, stepUser, objects.account.Account)
    const downloadedResource = await accountObject.downloadGdprExport()
    expect(downloadedResource).toContain('personal_data_export.json')
  }
)

When(
  '{string} changes the language to {string}',
  async ({ world }: { world: World }, stepUser: string, language: string): Promise<void> => {
    const accountObject = pageObjectFor(world, stepUser, objects.account.Account)
    const isAnonymousUser = stepUser === 'Anonymous'
    await accountObject.changeLanguage(language, isAnonymousUser)
  }
)

Then(
  '{string} should see the following account page title {string}',
  async ({ world }: { world: World }, stepUser: string, title: string): Promise<void> => {
    const accountObject = pageObjectFor(world, stepUser, objects.account.Account)
    const pageTitle = await accountObject.getTitle()
    expect(pageTitle).toEqual(title)
  }
)

When(
  '{string} uploads/changes the profile image {string}',
  async ({ world }: { world: World }, stepUser: string, profileImage: string): Promise<void> => {
    const accountObject = pageObjectFor(world, stepUser, objects.account.Account)
    const profileImagePath = world.filesEnvironment.getFile({ name: profileImage }).path
    await accountObject.uploadProfileImage({ path: profileImagePath })
  }
)

When(
  '{string} deletes the profile image',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const accountObject = pageObjectFor(world, stepUser, objects.account.Account)
    await accountObject.deleteProfileImage()
  }
)

Then(
  /^"([^"]+)" should( not)? have a profile picture$/,
  async ({ world }: { world: World }, stepUser: string, not: string | undefined): Promise<void> => {
    const accountObject = pageObjectFor(world, stepUser, objects.account.Account)
    const profilePicture = await accountObject.getProfilePicture()

    if (not) {
      await expect(profilePicture).toHaveCount(0)
    } else {
      await expect(profilePicture).toHaveAttribute('src', /.+/)
    }
  }
)
