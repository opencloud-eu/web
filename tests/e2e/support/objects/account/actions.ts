import { Locator, Page, expect } from '@playwright/test'
import util from 'util'
import { config } from '../../../config'

const accountMenuButton = '.oc-topbar-avatar'
const quotaValue = '.quota-information-text'
const accountManageButton = '#oc-topbar-account-manage'
const accountProfilePage = '//a[@data-nav-name="account-information"]'
const infoValue = '.account-page-info-%s td:nth-child(2)'
const requestExportButton = '[data-testid="request-export-btn"]'
const downloadExportButton = '[data-testid="download-export-btn"]'
const languageInput = '[data-testid="language"] .vs__search'
const languageValueDropDown = `.vs__dropdown-menu :text-is("%s")`
const languageValue = '[data-testid="language"] .vs__selected'
const accountPageTitle = '//main[@id="account"]//h1[1]'
const confirmButton = '.oc-modal-body-actions-confirm'
const topbarProfileAvatarImg = '.oc-topbar-personal-avatar .avatarImg'
const accountProfileAvatarImg = '.account-table .oc-avatar .avatarImg'
const removeAccountProfileAvatarButton = 'button:has-text("Remove")'

export const getQuotaValue = async (args: { page: Page }): Promise<string> => {
  const { page } = args
  await page.reload()
  await page.locator(accountMenuButton).click()
  const quotaText = await page.locator(quotaValue).textContent()
  await page.locator(quotaValue).click()

  // parse "0 B of 10 GB used"
  return quotaText.match(/\d+/g)?.[1]
}

export const getUserInfo = async (args: { page: Page; key: string }): Promise<string> => {
  const { page, key } = args
  await page.locator(accountMenuButton).click()
  await page.locator(accountManageButton).click()
  await page.locator(accountProfilePage).click()
  return await page.locator(util.format(infoValue, key)).textContent()
}

export const openAccountPage = async (args: { page: Page }): Promise<void> => {
  const { page } = args
  await page.locator(accountMenuButton).click()
  await page.locator(accountManageButton).click()
  await expect(page.locator('#account')).toBeVisible()
}

export const openAccountSubPage = async (args: { page: Page; subPage: string }): Promise<void> => {
  const { page, subPage } = args
  let id = ''

  switch (subPage) {
    case 'Profile':
      id = 'account-information'
      break
    case 'Preferences':
      id = 'account-preferences'
      break
    case 'Extensions':
      id = 'account-extensions'
      break
    case 'Calendar':
      id = 'account-calendar'
      break
    case 'GDPR':
      id = 'account-gdpr'
      break
  }
  await page.locator(util.format('//a[@data-nav-name="%s"]', id)).click()
  await expect(page.locator(`#${id}`)).toBeVisible()
}

export const requestGdprExport = async (args: { page: Page }): Promise<void> => {
  const { page } = args
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith('exportPersonalData') &&
        resp.status() === 202 &&
        resp.request().method() === 'POST'
    ),
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith('.personal_data_export.json') &&
        resp.status() === 207 &&
        resp.request().method() === 'PROPFIND' &&
        resp.text().then((text) => text.includes('HTTP/1.1 200 OK')),
      // generating GDPR report can take a while
      // so we need to increase the timeout to 60 seconds
      { timeout: config.timeout * 1000 }
    ),
    page.locator(requestExportButton).click()
  ])
}

export const downloadGdprExport = async (args: { page: Page }): Promise<string> => {
  const { page } = args

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(downloadExportButton).click()
  ])
  await page.locator(requestExportButton).waitFor()
  return download.suggestedFilename()
}

export const changeLanguage = async (args: {
  page: Page
  language: string
  isAnonymousUser: boolean
}): Promise<void> => {
  const { page, language, isAnonymousUser } = args
  await page.locator(languageInput).waitFor()
  await page.locator(languageInput).click()
  await page.locator(languageInput).pressSequentially(language)
  const promises = []

  if (!isAnonymousUser) {
    promises.push(
      page.waitForResponse(
        (res) =>
          res.url().includes('graph/v1.0/me') &&
          res.request().method() === 'PATCH' &&
          res.status() === 200
      )
    )
  }

  promises.push(page.locator(util.format(languageValueDropDown, language)).press('Enter'))
  await Promise.all(promises)

  await expect(page.locator(languageValue)).toHaveText(language)
}

export const getTitle = (args: { page: Page }): Promise<string> => {
  const { page } = args
  return page.locator(accountPageTitle).textContent()
}

export const uploadProfileImage = async (path: string, page: Page): Promise<void> => {
  await page.locator('input[type="file"]').setInputFiles(path)

  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith('/me/photo/$value') &&
        resp.status() === 200 &&
        resp.request().method() === 'PATCH'
    ),
    page.locator(confirmButton).click()
  ])

  await expect(page.locator(accountProfileAvatarImg)).toHaveAttribute('src')
  await expect(page.locator(topbarProfileAvatarImg)).toHaveAttribute('src')
}

export const deleteProfilePicture = async (args: { page: Page }): Promise<void> => {
  const { page } = args
  await page.locator(removeAccountProfileAvatarButton).click()
  await page.locator(confirmButton).click()
}

export const getProfilePicture = async (args: { page: Page }): Promise<Locator> => {
  const { page } = args
  return await page.locator(topbarProfileAvatarImg)
}
