import { Page, Locator } from '@playwright/test'
import util from 'util'

const resourceNameSelector =
  '//div[@id="files-space-table" or @id="tiles-view"]//*[@data-test-resource-name="%s"]'
const showLinkShareButton =
  '//span[@data-test-resource-name="%s"]/ancestor::tr[contains(@class, "oc-tbody-tr")]//button[contains(@data-test-indicator-type, "%s")]'

export const waitForResources = async ({
  page,
  names
}: {
  page: Page
  names: string[]
}): Promise<void> => {
  await Promise.all(
    names.map((name) => page.locator(util.format(resourceNameSelector, name)).waitFor())
  )
}

export const showShareIndicator = (args: {
  page: Page
  buttonLabel: string
  resource: string
}): Locator => {
  const { page, buttonLabel, resource } = args
  return page.locator(util.format(showLinkShareButton, resource, buttonLabel))
}
