import { Page, Locator } from '@playwright/test'
import util from 'util'

const spaceIdSelector = '//tr[@data-item-id="%s"]//*[contains(@class, "oc-resource-details")]//a'
const showEmptyTrashbinsButton = '//*[@data-testid="files-switch-projects-show-disabled"]//button'
const filesViewOptionButton = '#files-view-options-btn'
const emptyTrashbinQuickActionBtn =
  '//*[@data-test-resource-name="%s"]//ancestor::tr//button[@aria-label="Empty trash bin"]'
const actionConfirmButton = '.oc-modal-body-actions-confirm'
const footerTextSelector = '.oc-table-footer-row'

export interface openTrashBinArgs {
  id: string
  page: Page
}
export const openTrashbinOfProjectSpace = async (args: openTrashBinArgs): Promise<void> => {
  const { id, page } = args
  await page.locator(util.format(spaceIdSelector, id)).click()
}

export const openTrashbinOfPersonalSpace = async (page: Page): Promise<void> => {
  await page.getByTitle('Personal').click()
}

export const showEmptyTrashbins = async (page: Page): Promise<void> => {
  await page.locator(filesViewOptionButton).click()
  await page.locator(showEmptyTrashbinsButton).click()
  await page.locator(filesViewOptionButton).click()
}

export const getEmptyTrashbinLocator = async ({
  page,
  space
}: {
  page: Page
  space: string
}): Promise<Locator> => {
  return await page.locator(util.format(emptyTrashbinQuickActionBtn, space))
}

export const emptyTrashbinUsingQuickAction = async ({
  page,
  space
}: {
  page: Page
  space: string
}): Promise<void> => {
  await page.locator(util.format(emptyTrashbinQuickActionBtn, space)).click()
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().includes('trash-bin') &&
        resp.status() === 204 &&
        resp.request().method() === 'DELETE'
    ),
    page.locator(actionConfirmButton).click()
  ])
}

export const getTrashbinListFooterText = ({ page }: { page: Page }): Promise<string> => {
  return page.locator(footerTextSelector).textContent()
}
