import { Page, Locator, expect } from '@playwright/test'
import util from 'util'
import { config } from '../../../config'

const resourceProcessingIcon =
  '//*[@data-test-resource-name="%s"]/ancestor::*[self::li or self::tr]//span[@data-test-indicator-type="resource-processing"]'
const resourceLockIcon =
  '//*[@data-test-resource-name="%s"]/ancestor::*[self::li or self::tr]//span[@data-test-indicator-type="resource-locked"]'

const getProcessingLocator = (page: Page, resource: string): Locator => {
  return page.locator(util.format(resourceProcessingIcon, resource))
}

export const getLockLocator = (page: Page, resource: string): Locator => {
  return page.locator(util.format(resourceLockIcon, resource))
}

export const waitProcessingToFinish = async (page: Page, resource: string): Promise<void> => {
  await expect(
    getProcessingLocator(page, resource),
    'Waiting for file processing to finish'
  ).toBeHidden({ timeout: config.timeout * 1000 })
}

export const waitForLockToDisappear = async (page: Page, resource: string): Promise<void> => {
  await expect(getLockLocator(page, resource), 'Waiting for file lock to be removed').toBeHidden({
    timeout: config.timeout * 1000
  })
}
