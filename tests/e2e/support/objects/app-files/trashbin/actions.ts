import { Page, Locator } from '@playwright/test'
import util from 'util'

const spaceIdSelector = '(//*[@data-item-id="%s"]//a[contains(@class, "oc-resource-link")])[1]'
const showEmptyTrashbinsButton = '//*[@data-testid="files-switch-projects-show-disabled"]//button'
const filesViewOptionButton = '#files-view-options-btn'
const emptyTrashbinQuickActionBtn =
  '//*[@data-test-resource-name="%s"]//ancestor::tr//button[@aria-label="Empty trash bin"] | //*[@data-test-resource-name="%s"]//ancestor::li[contains(@class, "oc-tiles-item")]//button[@aria-label="Empty trash bin"]'
const actionConfirmButton = '.oc-modal-body-actions-confirm'
const footerTextSelector = '//*[@data-testid="files-list-footer-info"]'

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
  return await page.locator(util.format(emptyTrashbinQuickActionBtn, space, space))
}

export const emptyTrashbinUsingQuickAction = async ({
  page,
  space
}: {
  page: Page
  space: string
}): Promise<void> => {
  await page.locator(util.format(emptyTrashbinQuickActionBtn, space, space)).click()
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
