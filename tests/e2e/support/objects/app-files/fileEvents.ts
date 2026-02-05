import { Page, Locator } from '@playwright/test'
import util from 'util'
import { config } from '../../../config'

const resourceNameSelector =
  ':is(#files-files-table, .oc-tiles-item, #files-shared-with-me-accepted-section, .files-table) [data-test-resource-name="%s"]'
const resourceProcessingIcon =
  '//*[@data-test-resource-name="%s"]/ancestor::*[self::li or self::tr]//span[@data-test-indicator-type="resource-processing"]'

const getResourceLocator = (page: Page, resource: string): Locator => {
  return page.locator(util.format(resourceNameSelector, resource))
}

const getProcessingLocator = (page: Page, resource: string): Locator => {
  return page.locator(util.format(resourceProcessingIcon, resource))
}

export const waitProcessingToFinish = async (page: Page, resource: string): Promise<void> => {
  await getResourceLocator(page, resource).waitFor()

  const processingLocator = getProcessingLocator(page, resource)
  const timeout = (config.timeout / 2) * 1000
  const startTime = Date.now()
  let elapsedTime = 0

  while (elapsedTime < timeout) {
    if (!(await processingLocator.isVisible())) {
      return
    }
    console.info('[INFO] File in processing, waiting for it to finish...')
    await page.waitForTimeout(config.minTimeout * 1000)
    await page.reload()
    await getResourceLocator(page, resource).waitFor()

    elapsedTime = Date.now() - startTime
  }

  await Promise.reject(
    new Error(`${timeout}ms timeout exceeded: File "${resource}" is still in processing.`)
  )
}
