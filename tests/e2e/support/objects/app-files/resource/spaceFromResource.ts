import { Page } from '@playwright/test'
import util from 'util'
import { Space } from '../../../types'
import {
  actionConfirmationButton,
  resourceArgs,
  resourceNameInput,
  resourceNameSelector,
  selectAllCheckbox,
  selectOrDeselectResources
} from './shared'

const createSpaceFromResourceAction =
  '[role="menuitem"].oc-files-actions-create-space-from-resource-trigger'
const notificationMessage = '.oc-notification-message'
const firstResourceCheckbox =
  '(//*[contains(@class, "oc-table-data-cell-select")] | //*[@id="tiles-view"]//*[contains(@class, "oc-card-body")])//input'

export interface createSpaceFromFolderArgs {
  folderName: string
  spaceName: string
  page: Page
}

export interface createSpaceFromSelectionArgs {
  resources: string[]
  spaceName: string
  page: Page
}

export const createSpaceFromFolder = async ({
  page,
  folderName,
  spaceName
}: {
  page: Page
  folderName: string
  spaceName: string
}): Promise<Space> => {
  await page.locator(util.format(resourceNameSelector, folderName)).click({ button: 'right' })
  await page.locator(createSpaceFromResourceAction).click()
  await page.locator(resourceNameInput).fill(spaceName)
  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.status() === 201 &&
        resp.request().method() === 'POST' &&
        resp.url().endsWith('/drives?template=default')
    ),
    page.locator(util.format(actionConfirmationButton, 'Create')).click()
  ])

  await page.locator(notificationMessage).waitFor()
  return (await response.json()) as Space
}

export const createSpaceFromSelection = async ({
  page,
  resources,
  spaceName
}: {
  page: Page
  resources: string[]
  spaceName: string
}): Promise<Space> => {
  await selectOrDeselectResources({
    page,
    resources: resources.map((r) => ({ name: r }) as resourceArgs), // prettier-ignore
    select: true
  })
  await page.locator(util.format(resourceNameSelector, resources[0])).click({ button: 'right' })

  await page.locator(createSpaceFromResourceAction).click()
  await page.locator(resourceNameInput).fill(spaceName)
  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.status() === 201 &&
        resp.request().method() === 'POST' &&
        resp.url().endsWith('/drives?template=default')
    ),
    page.locator(util.format(actionConfirmationButton, 'Create')).click()
  ])
  await page.locator(notificationMessage).waitFor()
  return (await response.json()) as Space
}

export const createSpaceFromAll = async ({
  page,
  spaceName
}: {
  page: Page
  spaceName: string
}): Promise<Space> => {
  await page.locator(selectAllCheckbox).click()
  await page.locator(firstResourceCheckbox).first().click({ button: 'right' })

  await page.locator(createSpaceFromResourceAction).click()
  await page.locator(resourceNameInput).fill(spaceName)
  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.status() === 201 &&
        resp.request().method() === 'POST' &&
        resp.url().endsWith('/drives?template=default')
    ),
    page.locator(util.format(actionConfirmationButton, 'Create')).click()
  ])
  await page.locator(notificationMessage).waitFor()
  return (await response.json()) as Space
}
