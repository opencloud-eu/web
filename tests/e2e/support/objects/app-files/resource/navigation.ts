import { Locator, Page, Response, expect } from '@playwright/test'
import util from 'util'
import { sidebar } from '../utils'
import { environment, utils } from '../../../../support'
import { state } from '../../../../environment/shared'
import {
  actionConfirmationButton,
  addNewResourceButton,
  breadcrumbResourceNameSelector,
  checkBox,
  clickResource,
  fileRow,
  filesContextMenuAction,
  openWithButton,
  resourceNameSelector,
  selectBatchAction,
  sideBarActionButton
} from './shared'

const breadcrumbLastResourceNameSelector = '.oc-breadcrumb-item-text-last'
const breadcrumbResourceSelector = `${breadcrumbResourceNameSelector}//ancestor::li`
const createNewShortcutButton = '#new-shortcut-btn'
const shortcutResorceInput = '#create-shortcut-modal-url-input'
const filesViewOptionButton = '#files-view-options-btn'
const hiddenFilesToggleButton = '//*[@data-testid="files-switch-hidden-files"]//button'
const noLinkMessage = '#web .oc-link-resolve [data-testid="error-message"]'
const listItemPageSelector = '//*[contains(@class,"oc-pagination-list-item-page") and text()="%s"]'
const itemsPerPageDropDownOptionSelector =
  '//li[contains(@class,"vs__dropdown-option") and text()="%s"]'
const footerTextSelector = '//*[@data-testid="files-list-footer-info"]'
const filesTableRowSelector = 'tbody tr'
const filesTableTilesSelector = '.oc-tiles-item'
const itemsPerPageDropDownSelector = '.vs__actions'
const filesPaginationNavSelector = '.files-pagination'
const sideBarActions =
  '//ul[@id="oc-files-actions-sidebar"]//button[not(@disabled)]//span[contains(@class,"oc-files-context-action-label")]/span'
const sharerAvatarSelector =
  '//*[@data-test-resource-name="%s"]/ancestor::tr//td[contains(@class, "oc-table-data-cell-sharedBy")]//img'
const recipientAvatarSelector =
  '//*[@data-test-resource-name="%s"]/ancestor::tr//td[contains(@class, "oc-table-data-cell-sharedWith")]//img'
const userAvatarInActivitypanelSelector = '[data-test-user-name="%s"]'
const mobileViewmodeSwitchBtn = '#viewmode-switch-toggle'
const mobileViewmodeSwitchDropdown = '#viewmode-switch-drop'
const fileDetailsSidebar = '#oc-file-details-sidebar'
const fileDetailsTimestamp = '#oc-file-details-sidebar [data-testid="timestamp"]'
const activitySidebarPanel = 'sidebar-panel-activities'
const activitySidebarPanelBodyContent = '#sidebar-panel-activities .sidebar-panel__body-content'
const subContextMenuAction = '//*[@id="app-runtime-drop"]//span[text()="%s"]'
const tilesSlider = '#tiles-size-slider'
const previewFavoriteButton = '.preview-controls-favorite'
const filesContextMenu = 'div[id^="context-menu-drop"]'
const showSharesActionSelector = 'button.oc-files-actions-show-shares-trigger'
const quickActionShareButton =
  '//*[@data-test-resource-name="%s"]/ancestor::tr//button[contains(@class, "files-quick-action-show-shares")]'
const inviteCollaboratorForm = '#new-collaborators-form'
const addPublicLinkButton = '#files-file-link-add'

export const clickResourceFromBreadcrumb = async ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Promise<void> => {
  const folder = utils.locatorUtils.buildXpathLiteral(resource)
  const itemId = await page
    .locator(util.format(breadcrumbResourceSelector, folder))
    .getAttribute('data-item-id')
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        (resp.status() === 207 &&
          resp.request().method() === 'PROPFIND' &&
          resp.url().endsWith(encodeURIComponent(resource))) ||
        resp.url().endsWith(itemId) ||
        resp.url().endsWith(encodeURIComponent(itemId))
    ),
    page.locator(util.format(breadcrumbResourceNameSelector, folder)).click()
  ])
  await expect(page.locator(breadcrumbLastResourceNameSelector)).toHaveText(resource)
}

export const openTemplateFile = async ({
  page,
  resource,
  webOffice
}: {
  page: Page
  resource: string
  webOffice: string
}): Promise<void> => {
  await page.locator(util.format(resourceNameSelector, resource)).click({ button: 'right' })
  await page.locator(openWithButton).hover()
  await page.locator(util.format(subContextMenuAction, webOffice)).click()
}

export const createFileFromTemplate = async ({
  page,
  resource,
  webOffice,
  via
}: {
  page: Page
  resource: string
  webOffice: string
  via: string
}): Promise<void> => {
  const menuItem = `Create from template via ${webOffice}`
  if (via.startsWith('sidebar')) {
    await sidebar.open({ page, resource })
    await sidebar.openPanel({ page, name: 'actions' })
    await page.locator(util.format(sideBarActionButton, menuItem)).click()
    return
  } else if (via.startsWith('context')) {
    await page.locator(util.format(resourceNameSelector, resource)).click({ button: 'right' })
    await page.locator(openWithButton).hover()
    await page.locator(util.format(subContextMenuAction, menuItem)).click()
    return
  }
  throw new Error(`Invalid action '${via}' was provided`)
}

export interface switchViewModeArgs {
  page: Page
  target: 'table' | 'tiles' | 'table-condensed'
}

export const clickViewModeToggle = async (args: switchViewModeArgs): Promise<void> => {
  const { page, target } = args

  if (state.projectName === 'mobile-chromium' || state.projectName === 'mobile-webkit') {
    await page.locator(mobileViewmodeSwitchBtn).click()
    await expect(page.locator(mobileViewmodeSwitchDropdown)).toBeVisible()

    const mobileTexts = {
      table: 'Default table view',
      tiles: 'Tiles view',
      'table-condensed': 'Condensed table view'
    }
    await page.getByText(mobileTexts[target]).first().click()
  } else {
    const webSelectors = {
      table: 'resource-table',
      tiles: 'resource-tiles',
      'table-condensed': 'resource-table-condensed'
    }
    await page.locator('#viewmode-switch-toggle').click()
    await page.locator(`#viewmode-switch-drop .${webSelectors[target]}`).click()
  }
  await expect(page.locator(mobileViewmodeSwitchDropdown)).toBeHidden()
}

export const expectThatResourcesAreDisplayedAs = async (args: {
  page: Page
  viewMode: string
}): Promise<void> => {
  const { page, viewMode } = args
  const viewSelectors = {
    table: '#files-view .oc-table',
    tiles: '#files-view .oc-tiles',
    'table-condensed': '#files-view .oc-table.oc-table-condensed'
  }

  const selector = viewSelectors[viewMode as keyof typeof viewSelectors]
  await expect(page.locator(selector)).toBeVisible()
}

export const showHiddenResources = async (page: Page): Promise<void> => {
  await page.locator(filesViewOptionButton).click()
  await page.locator(hiddenFilesToggleButton).click()
  // close the files view option
  await page.locator(filesViewOptionButton).click()
}

export const expectThatPublicLinkIsDeleted = async (args: {
  page: Page
  url: string
}): Promise<void> => {
  const { page, url } = args
  await Promise.all([
    page.waitForResponse((resp) => resp.status() === 404 && resp.request().method() === 'PROPFIND'),
    page.goto(url)
  ])
  await expect(page.locator(noLinkMessage)).toHaveText(
    'The resource could not be located, it may not exist anymore.'
  )
}

export interface changePageArgs {
  page: Page
  pageNumber: string
}

export const changePage = async (args: changePageArgs): Promise<void> => {
  const { page, pageNumber } = args
  await page.locator(util.format(listItemPageSelector, pageNumber)).click()
}

export interface changeItemsPerPageArgs {
  page: Page
  itemsPerPage: string
}

export const changeItemsPerPage = async (args: changeItemsPerPageArgs): Promise<void> => {
  const { page, itemsPerPage } = args
  await page.locator(filesViewOptionButton).click()
  await page.locator(itemsPerPageDropDownSelector).click()
  await page.locator(util.format(itemsPerPageDropDownOptionSelector, itemsPerPage)).click()
  // close the files view option
  await page.locator(filesViewOptionButton).click()
}

export const getFileListFooterText = ({ page }: { page: Page }): Promise<string> => {
  return page.locator(footerTextSelector).textContent()
}

export interface expectNumberOfResourcesInThePageToBeArgs {
  page: Page
  numberOfResources: number
}

export const countNumberOfResourcesInThePage = async ({
  page
}: {
  page: Page
}): Promise<number> => {
  // playwright's default count function is not used here because count only counts
  // elements that are visible in the page but in this case we want to get
  // all the elements present
  await page.locator(footerTextSelector).waitFor()
  return page.evaluate(
    ([filesTableRowSelector, filesTableTilesSelector]) => {
      const rows = document.querySelectorAll(filesTableRowSelector).length
      const tiles = document.querySelectorAll(filesTableTilesSelector).length
      return Promise.resolve(Math.max(rows, tiles))
    },
    [filesTableRowSelector, filesTableTilesSelector]
  )
}

export const expectPageNumberNotToBeVisible = async ({ page }: { page: Page }): Promise<void> => {
  await expect(page.locator(filesPaginationNavSelector)).not.toBeVisible()
}

export const expectPageNumberToBeVisible = async ({ page }: { page: Page }): Promise<void> => {
  await expect(page.locator(filesPaginationNavSelector)).toBeVisible()
}

export const createShotcut = async (args: shortcutArgs): Promise<void> => {
  const { page, resource, name, type } = args
  await page.locator(addNewResourceButton).click()
  await page.locator(createNewShortcutButton).click()

  switch (type) {
    case 'folder':
    case 'space':
    case 'file': {
      await page.locator(shortcutResorceInput).fill(resource)
      const searchResult = page.locator('#create-shortcut-modal-contextmenu .oc-resource-name')
      await expect(searchResult).toHaveText(resource)
      await searchResult.click()
      break
    }
    case 'public link':
      const link = new environment.LinksEnvironment()
      await page.locator(shortcutResorceInput).fill(link.getLink({ name: resource }).url)
      break
    case 'website': {
      await page.locator(shortcutResorceInput).fill(resource)
      await page.locator('#create-shortcut-modal-contextmenu').click()
      break
    }
  }

  if (name) {
    await page.getByLabel('Shortcut name').fill(name)
  }
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.status() === 201 && resp.request().method() === 'PUT' && resp.url().endsWith('url')
    ),
    page.locator(util.format(actionConfirmationButton, 'Create')).click()
  ])
}

export interface shortcutArgs {
  page: Page
  resource: string
  name: string
  type: shortcutType
}

export type shortcutType = 'folder' | 'file' | 'public link' | 'space' | 'website'

export const openShotcut = async ({
  page,
  name,
  url
}: {
  page: Page
  name: string
  url?: string
}): Promise<void> => {
  const resource = page.locator(util.format(resourceNameSelector, name))
  if (url) {
    const popupPromise = page.waitForEvent('popup')
    await resource.click()
    const popup = await popupPromise
    await popup.waitForURL(url)
  } else {
    const itemId = await resource.locator(fileRow).getAttribute('data-item-id')
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().endsWith(encodeURIComponent(name)) || resp.url().endsWith(itemId)
      ),
      resource.click()
    ])
  }
}

export interface canManageResourceArgs {
  resource: string
  page: Page
}

export const canManageResource = async (args: canManageResourceArgs): Promise<boolean> => {
  const { resource, page } = args
  const notExpectedActions = ['move', 'rename', 'delete']
  await sidebar.open({ page: page, resource })
  await sidebar.openPanel({ page: page, name: 'actions' })
  const presentActions = await page.locator(sideBarActions).allTextContents()
  const presentActionsToLower = presentActions.map((actions) => actions.toLowerCase())
  for (const actions of notExpectedActions) {
    if (presentActionsToLower.includes(actions)) {
      return true
    }
  }
  return false
}

export const getAllAvailableActions = async ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Promise<string[]> => {
  await sidebar.open({ page: page, resource })
  await sidebar.openPanel({ page: page, name: 'actions' })
  return await page.getByTestId('action-label').allTextContents()
}

export const checkActivity = async ({
  page,
  resource,
  activity
}: {
  page: Page
  resource: string
  activity: string
}): Promise<void> => {
  const paths = resource.split('/')
  const finalResource = paths.pop()
  for (const path of paths) {
    await clickResource({ page, path })
  }
  await sidebar.open({ page: page, resource: finalResource })
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.status() === 200 &&
        resp.request().method() === 'GET' &&
        resp.request().url().includes('/extensions/org.libregraph/activities')
    ),
    sidebar.openPanel({ page: page, name: 'activities' })
  ])
  await expect(page.getByTestId(activitySidebarPanel)).toBeVisible()
  await expect(page.locator(activitySidebarPanelBodyContent)).toContainText(activity)
}

export const checkEmptyActivity = async ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Promise<void> => {
  const paths = resource.split('/')
  const finalResource = paths.pop()
  for (const path of paths) {
    await clickResource({ page, path })
  }
  await sidebar.open({ page: page, resource: finalResource })
  await sidebar.openPanel({ page: page, name: 'activities' })
  await expect(page.getByTestId(activitySidebarPanel)).toBeVisible()
  await expect(page.locator(activitySidebarPanelBodyContent)).toContainText('No activities')
}
const AVATAR_SELECTORS = {
  sharer: sharerAvatarSelector,
  recipient: recipientAvatarSelector
} as const

export const getAvatarLocator = (args: {
  page: Page
  resource: string
  avatarType: keyof typeof AVATAR_SELECTORS
}): Locator => {
  const { page, resource, avatarType } = args
  return page.locator(util.format(AVATAR_SELECTORS[avatarType], resource))
}

export const getAvatarLocatorFromActivityPanel = async (args: {
  page: Page
  resource: string
  avatarUser: string
}): Promise<Locator> => {
  const { page, resource, avatarUser } = args
  const paths = resource.split('/')
  const finalResource = paths.pop()
  for (const path of paths) {
    await clickResource({ page, path })
  }
  await sidebar.open({ page: page, resource: finalResource })
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.status() === 200 &&
        resp.request().method() === 'GET' &&
        resp.request().url().includes('/extensions/org.libregraph/activities')
    ),
    sidebar.openPanel({ page: page, name: 'activities' })
  ])
  const user = new environment.UsersEnvironment().getCreatedUser({ key: avatarUser })

  return page.locator(util.format(userAvatarInActivitypanelSelector, user.username)).locator('img')
}

export const reduceTileSize = async ({ page }: { page: Page }): Promise<void> => {
  await page.locator(filesViewOptionButton).click()
  const slider = page.locator(tilesSlider)
  await slider.focus()
  await page.keyboard.press('ArrowLeft')
}

export const openRightSidebar = async ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Promise<void> => {
  await sidebar.open({ page, resource })
}
// Regression guard for https://github.com/opencloud-eu/web/pull/3098:
export const checkFileDetailsSidebar = async ({ page }: { page: Page }): Promise<void> => {
  await expect(page.locator(fileDetailsSidebar)).toBeVisible()
  await expect(page.locator(fileDetailsTimestamp)).toBeVisible()
}

export type PanelType = 'actions' | 'sharing' | 'versions' | 'activities'

export const openResourcePanel = async ({
  page,
  resource,
  panel
}: {
  page: Page
  resource: string
  panel: PanelType
}): Promise<void> => {
  await sidebar.open({ page, resource })
  await sidebar.openPanel({ page, name: panel })
}

export const markAsFavorite = async ({
  page,
  method,
  resources
}: {
  page: Page
  method: 'context menu' | 'sidebar panel' | 'batch action' | 'preview'
  resources: string[]
}): Promise<void> => {
  const waitForFollowResponse = (): Promise<Response> =>
    page.waitForResponse(
      (resp) =>
        resp.status() === 201 &&
        resp.request().method() === 'POST' &&
        resp.url().endsWith('/follow')
    )

  switch (method) {
    case 'context menu':
      for (const resource of resources) {
        const postPromise = waitForFollowResponse()
        await page.locator(util.format(resourceNameSelector, resource)).click({ button: 'right' })
        await page.locator(util.format(filesContextMenuAction, 'favorite')).click()
        await postPromise
      }
      break

    case 'sidebar panel':
      for (const resource of resources) {
        const postPromise = waitForFollowResponse()
        await sidebar.open({ page, resource })
        await sidebar.openPanel({ page, name: 'actions' })
        await page.locator(util.format(sideBarActionButton, 'Add to favorites')).click()
        await postPromise
      }
      break

    case 'batch action': {
      const postPromises = resources.map(() => waitForFollowResponse())
      for (const resource of resources) {
        await page.locator(util.format(checkBox, resource)).click()
      }
      await selectBatchAction(page, 'favorite')
      await Promise.all(postPromises)
      break
    }

    case 'preview': {
      const postPromise = waitForFollowResponse()
      const favoriteBtn = page.locator(previewFavoriteButton)
      await expect(favoriteBtn).toHaveAttribute('aria-label', 'Add to favorites')
      await favoriteBtn.click()
      await expect(favoriteBtn).toHaveAttribute('aria-label', 'Remove from favorites')
      await postPromise
      break
    }
  }
}

export const unmarkAsFavorite = async ({
  page,
  method,
  resources
}: {
  page: Page
  method: 'context menu' | 'sidebar panel' | 'batch action'
  resources: string[]
}): Promise<void> => {
  const waitForUnfollowResponse = (): Promise<Response> =>
    page.waitForResponse(
      (resp) =>
        resp.status() === 204 &&
        resp.request().method() === 'DELETE' &&
        resp.url().includes('me/drive/following')
    )

  switch (method) {
    case 'context menu':
      for (const resource of resources) {
        const deletePromise = waitForUnfollowResponse()
        await page.locator(util.format(resourceNameSelector, resource)).click({ button: 'right' })
        const removeFavoriteBtn = page.locator(util.format(filesContextMenuAction, 'favorite'))
        await expect(removeFavoriteBtn).toHaveAttribute('aria-label', 'Remove from favorites')
        await removeFavoriteBtn.click()
        await deletePromise
      }
      break

    case 'sidebar panel':
      for (const resource of resources) {
        const deletePromise = waitForUnfollowResponse()
        await sidebar.open({ page, resource })
        await sidebar.openPanel({ page, name: 'actions' })
        const removeFavoriteBtn = page.locator(
          util.format(sideBarActionButton, 'Remove from favorites')
        )
        await removeFavoriteBtn.click()
        await deletePromise
      }
      break

    case 'batch action': {
      const deletePromises = resources.map(() => waitForUnfollowResponse())
      for (const resource of resources) {
        await page.locator(util.format(checkBox, resource)).click()
      }
      await selectBatchAction(page, 'favorite')
      await Promise.all(deletePromises)
      break
    }
  }
}

export const expectResourceNotShareable = async ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Promise<void> => {
  await expect(page.locator(util.format(quickActionShareButton, resource))).toBeHidden()

  await sidebar.open({ page, resource })
  await sidebar.openPanel({ page, name: 'sharing' })
  await expect(page.locator(inviteCollaboratorForm)).toBeHidden()
  await expect(page.locator(addPublicLinkButton)).toBeHidden()
  await sidebar.close({ page })

  await page.locator(util.format(resourceNameSelector, resource)).click({ button: 'right' })
  const contextMenu = page.locator(filesContextMenu)
  await expect(contextMenu).toBeVisible()
  await expect(contextMenu.locator(showSharesActionSelector)).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(contextMenu).toBeHidden()
}
