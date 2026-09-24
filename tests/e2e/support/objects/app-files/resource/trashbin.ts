import { Page, expect } from '@playwright/test'
import util from 'util'
import {
  actionConfirmationButton,
  checkBox,
  fileRow,
  notificationMessageDialog,
  resourceNameSelector
} from './shared'

const checkBoxForTrashbin = `//*[@data-test-selection-resource-path="%s"]//input[@type="checkbox"]`
const filesSelector = '//*[@data-test-resource-name="%s"]'
const permanentDeleteButton = '.oc-files-actions-delete-permanent-trigger'
const restoreResourceButton = '.oc-files-actions-restore-trigger'
const emptyTrashbinButtonSelector = '.oc-files-actions-empty-trash-bin-trigger'

export interface deleteResourceTrashbinArgs {
  page: Page
  resource: string
}

export interface deleteTrashbinMultipleResourcesArgs extends Omit<
  deleteResourceTrashbinArgs,
  'resource'
> {
  resources: string[]
}

export const deleteResourceTrashbin = async (args: deleteResourceTrashbinArgs): Promise<string> => {
  const { page, resource } = args
  const resourceCheckbox = page.locator(
    util.format(checkBoxForTrashbin, `/${resource.replace(/^\/+/, '')}`)
  )
  await new Promise((resolve) => setTimeout(resolve, 5000))
  if (!(await resourceCheckbox.isChecked())) {
    await resourceCheckbox.click()
  }

  await page.locator(permanentDeleteButton).first().click()
  await Promise.all([
    page.waitForResponse((resp) => resp.status() === 204 && resp.request().method() === 'DELETE'),
    page.locator(util.format(actionConfirmationButton, 'Delete')).click()
  ])
  const message = await page.locator(notificationMessageDialog).textContent()
  return message.trim().toLowerCase()
}

export const deleteTrashbinMultipleResources = async (
  args: deleteTrashbinMultipleResourcesArgs
): Promise<void> => {
  const { page, resources } = args
  for (const resource of resources) {
    await page.locator(util.format(checkBox, resource)).click()
  }

  await page.locator(permanentDeleteButton).first().click()
  await Promise.all([
    page.waitForResponse((resp) => resp.status() === 204 && resp.request().method() === 'DELETE'),
    page.locator(util.format(actionConfirmationButton, 'Delete')).click()
  ])

  for (const resource of resources) {
    await expect(page.locator(util.format(filesSelector, resource))).not.toBeVisible()
  }
}

export const emptyTrashbin = async ({ page }: { page: Page }): Promise<void> => {
  await page.locator(emptyTrashbinButtonSelector).click()
  await Promise.all([
    page.waitForResponse((resp) => resp.status() === 204 && resp.request().method() === 'DELETE'),
    page.locator(util.format(actionConfirmationButton, 'Delete')).click()
  ])
  const message = await page.locator(notificationMessageDialog).textContent()
  expect(message).toBe('All deleted files were removed')
}

export const expectThatDeleteButtonIsNotVisible = async (
  args: deleteResourceTrashbinArgs
): Promise<void> => {
  const { page, resource } = args
  const resourceCheckbox = page.locator(
    util.format(checkBoxForTrashbin, `/${resource.replace(/^\/+/, '')}`)
  )
  if (!(await resourceCheckbox.isChecked())) {
    await resourceCheckbox.click()
  }
  const deleteButton = page.locator(permanentDeleteButton)
  await expect(deleteButton).not.toBeVisible()
}

export interface restoreResourceTrashbinArgs {
  resource: string
  page: Page
}

export interface batchRestoreTrashbinResourcesArgs {
  resources: string[]
  page: Page
}

export const selectTrashbinResource = async (page: Page, resource: string): Promise<void> => {
  const resourceCheckbox = page.locator(
    util.format(checkBoxForTrashbin, `/${resource.replace(/^\/+/, '')}`)
  )
  if (!(await resourceCheckbox.isChecked())) {
    await resourceCheckbox.click()
  }
}

export const restoreTrashBinResource = async (
  args: restoreResourceTrashbinArgs
): Promise<string> => {
  const { page, resource } = args
  await selectTrashbinResource(page, resource)

  const resourceNameLocator = page.locator(util.format(resourceNameSelector, resource))
  const itemId = await resourceNameLocator.locator(fileRow).getAttribute('data-item-id')

  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.status() === 201 &&
        resp.request().method() === 'MOVE' &&
        resp.request().url().endsWith(`/${itemId}`)
    ),
    page.locator(restoreResourceButton).click()
  ])

  const message = await page.locator(notificationMessageDialog).textContent()
  return message.trim().toLowerCase()
}

export const batchRestoreTrashBinResources = async (
  args: batchRestoreTrashbinResourcesArgs
): Promise<string> => {
  const { page, resources } = args

  const waitResponses = []
  for (const resource of resources) {
    await selectTrashbinResource(page, resource)
    const resourceNameLocator = page.locator(util.format(resourceNameSelector, resource))
    const itemId = await resourceNameLocator.locator(fileRow).getAttribute('data-item-id')
    waitResponses.push(
      page.waitForResponse(
        (resp) =>
          resp.status() === 201 &&
          resp.request().method() === 'MOVE' &&
          resp.request().url().endsWith(`/${itemId}`)
      )
    )
  }

  await Promise.all([...waitResponses, page.locator(restoreResourceButton).click()])

  const message = await page.locator(notificationMessageDialog).textContent()
  return message.trim().toLowerCase()
}

export const expectThatRestoreResourceButtonVisibility = async (
  args: restoreResourceTrashbinArgs
): Promise<void> => {
  const { page, resource } = args
  const resourceCheckbox = page.locator(
    util.format(checkBoxForTrashbin, `/${resource.replace(/^\/+/, '')}`)
  )
  if (!(await resourceCheckbox.isChecked())) {
    await resourceCheckbox.click()
  }
  const restoreButton = page.locator(restoreResourceButton)
  await expect(restoreButton).not.toBeVisible()
}
