import { Page, Locator } from '@playwright/test'
import util from 'util'
import { config } from '../../../config'

const resourceNameSelector =
  ':is(#files-files-table, .oc-tiles-item, #files-shared-with-me-accepted-section, .files-table) [data-test-resource-name="%s"]'
const resourceProcessingIcon =
  '//*[@data-test-resource-name="%s"]/ancestor::*[self::li or self::tr]//span[@data-test-indicator-type="resource-processing"]'
const resourceLockIcon =
  '//*[@data-test-resource-name="%s"]/ancestor::*[self::li or self::tr]//span[@data-test-indicator-type="resource-locked"]'

const getResourceLocator = (page: Page, resource: string): Locator => {
  return page.locator(util.format(resourceNameSelector, resource))
}

const getProcessingLocator = (page: Page, resource: string): Locator => {
  return page.locator(util.format(resourceProcessingIcon, resource))
}

export const getLockLocator = (page: Page, resource: string): Locator => {
  return page.locator(util.format(resourceLockIcon, resource))
}

export const waitProcessingToFinish = async (page: Page, resource: string): Promise<void> => {
  await waitNotToBeVisible(
    page,
    getProcessingLocator(page, resource),
    'Waiting for file processing to finish',
    () => getResourceLocator(page, resource).waitFor()
  )
}

export const waitForLockToDisappear = async (page: Page, resource: string): Promise<void> => {
  await waitNotToBeVisible(
    page,
    getLockLocator(page, resource),
    'Waiting for file lock to be removed',
    () => getResourceLocator(page, resource).waitFor()
  )
}

const waitNotToBeVisible = async (
  page: Page,
  locator: Locator,
  message: string,
  fn?: () => Promise<void>
) => {
  const timeout = (config.timeout / 2) * 1000
  const startTime = Date.now()
  let elapsedTime = 0

  while (elapsedTime < timeout) {
    if (!(await locator.isVisible())) {
      return
    }
    console.info(`[INFO] ${message}...`)
    await page.waitForTimeout(config.minTimeout * 1000)
    await page.reload()

    if (fn) {
      await fn()
    }

    elapsedTime = Date.now() - startTime
  }

  await Promise.reject(new Error(`${timeout}ms timeout exceeded: ${message}`))
}
