import { errors, Locator, Page } from '@playwright/test'
import util from 'util'

const acceptedShareItem =
  '//*[@data-test-resource-name="%s"]/ancestor::tr//span[@data-test-user-name="%s"]'
const resourceItem = '//*[@data-test-resource-name="%s"]/ancestor::*[self::li or self::tr]'
export const syncedIndicator = '[data-test-indicator-type="resource-synced"]'

export const getSyncedIndicatorLocator = ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Locator => {
  return page.locator(util.format(resourceItem, resource)).locator(syncedIndicator)
}

export const isAcceptedSharePresent = async ({
  page,
  resource,
  owner,
  timeout = 500
}: {
  page: Page
  resource: string
  owner: string
  timeout?: number
}): Promise<boolean> => {
  let exist = true
  await page
    .locator(util.format(acceptedShareItem, resource, owner))
    .waitFor({ timeout })
    .catch((e) => {
      if (!(e instanceof errors.TimeoutError)) {
        throw e
      }

      exist = false
    })

  return exist
}
