import { Locator, Page, expect } from '@playwright/test'
import util from 'util'
import { unlockVault, vaultPassphraseInput } from './vault'

export const fileRow =
  '//ancestor::*[(contains(@class, "oc-tile-card") or contains(@class, "oc-tbody-tr"))]'
export const resourceNameSelector =
  ':is(#files-files-table, .oc-tiles-item, #files-shared-with-me-accepted-section, .files-table) [data-test-resource-name="%s"]'

export const getResourceLocator = ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Locator => {
  return page.locator(util.format(resourceNameSelector, resource))
}

export const clickResource = async ({
  page,
  path,
  password
}: {
  page: Page
  path: string
  password?: string
}): Promise<void> => {
  const paths = path.split('/')
  for (const name of paths) {
    // if resource name consists of single or double quotes, add an escape character
    const folder = name.replace(/'/g, "\\'").replace(/"/g, '\\"')

    const resource = page.locator(util.format(resourceNameSelector, folder))
    const propfindPromise = page.waitForResponse(
      (resp) => resp.status() === 207 && resp.request().method() === 'PROPFIND'
    )
    await resource.click()
    if (password && folder.includes('.vault')) {
      await unlockVault({ page, passphrase: password })
    }
    await propfindPromise
    // wait for the loading spinner to disappear and page is loaded
    await expect(page.locator('#app-loading-spinner')).toBeHidden()
  }
}

export const createNewFolderInEmbedMode = async ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Promise<void> => {
  const frame = page.frameLocator(opencloudFrame)
  await frame.locator(addNewResourceButton).click()
  await frame.locator(createNewFolderButton).click()
  await frame.locator(resourceNameInput).fill(resource)
  const createBtn = frame.locator(util.format(actionConfirmationButton, 'Create'))
  await expect(createBtn).toBeEnabled()

  const mkcolPromise = page.waitForResponse(
    (resp) => resp.status() === 201 && resp.request().method() === 'MKCOL'
  )
  await createBtn.click()
  await mkcolPromise
}
/**/

export interface resourceArgs {
  name: string
  type?: string
}

export type ActionViaType =
  'SIDEBAR_PANEL' | 'BATCH_ACTION' | 'SINGLE_SHARE_VIEW' | 'PREVIEW_TOPBAR'

export type selectResourcesArgs = {
  page: Page
  resources: resourceArgs[]
  folder?: string
  select: boolean
}

export const selectOrDeselectResources = async (args: selectResourcesArgs): Promise<void> => {
  const { page, folder, resources, select } = args
  if (folder) {
    await clickResource({ page, path: folder })
  }
  for (const resource of resources) {
    await page.locator(util.format(checkBox, resource.name)).waitFor()
    const resourceCheckbox = page.locator(util.format(checkBox, resource.name))
    if (!(await resourceCheckbox.isChecked()) && select) {
      await resourceCheckbox.click()
    } else if (await resourceCheckbox.isChecked()) {
      await resourceCheckbox.click()
    }
  }
}

export const selectAll = async ({ page }: { page: Page }): Promise<void> => {
  await page.locator(selectAllCheckbox).click()
}
/**
 * Navigate back to where a step started. If the start is a vault, it needs
 * to be unlocked because the vault gets locked initially after a reload.
 */
export const returnToStartUrl = async ({
  page,
  startUrl,
  password
}: {
  page: Page
  startUrl: string
  password?: string
}): Promise<void> => {
  await page.goto(startUrl)
  if (!password) {
    return
  }
  const passphraseInput = page.locator(vaultPassphraseInput)
  try {
    // Whichever of the two renders first says where the load landed: the
    // unlock page for a locked vault, the file list for anything else.
    await expect(passphraseInput.or(page.locator(filesView))).toBeVisible()
  } catch {
    return
  }
  if (!(await passphraseInput.isVisible())) {
    return
  }
  await unlockVault({ page, passphrase: password })
  await expect(page.locator(appLoadingSpinner)).toBeHidden()
}

export const appLoadingSpinner = '#app-loading-spinner'
export const filesView = '#files-view'
export const appBarContextMenu = '#oc-openfile-contextmenu-trigger'
export const checkBox = `//*[@data-test-selection-resource-name="%s"]//input[@type="checkbox"]`
// following breadcrumb selectors is passed to buildXpathLiteral function as the content to be inserted might contain quotes
export const breadcrumbResourceNameSelector =
  '//*[@id="files-breadcrumb"]//li[contains(@class, "oc-breadcrumb-list-item")]//span[text()[normalize-space(.)=%s]]'
export const addNewResourceButton = `.oc-app-floating-action-button`
export const createNewFolderButton = '#new-folder-btn'
export const resourceNameInput = '.oc-modal input'
export const filesBatchAction = '.files-app-bar-actions .oc-files-actions-%s-trigger'
export const actionConfirmationButton =
  '//button[contains(@class,"oc-modal-body-actions-confirm") and text()="%s"]'
export const actionSecondaryConfirmationButton = '.oc-modal-body-actions-secondary'
export const sideBarActionButton =
  '//div[contains(@class, "files-side-bar")]//*[contains(@data-testid, "action-handler")]//span[text()="%s"]'
export const notificationMessageDialog = '.oc-notification-message-title'
export const externalEditorIframe = '[name="app-iframe"]'
export const filesContextMenuAction =
  'div[id^="context-menu-drop"] button.oc-files-actions-%s-trigger'
export const selectAllCheckbox =
  '//input[@type="checkbox" and (@id="tiles-view-select-all" or @id="resource-table-select-all")]'
// OpenCloud iframe
export const opencloudFrame = 'iframe[title="OpenCloud"]'
export const collaboraDocTextAreaSelector = '#clipboard-area'
// Euro-Office
export const euroOfficeInnerFrameSelector = '[name="frameEditor"]'
export const euroOfficeSaveButtonSelector = '#slot-btn-dt-save > button'
export const euroOfficeDocTextAreaSelector = '#area_id'
export const openWithButton =
  '//*[@id="oc-files-context-actions-primary"]//span[text()="Open with..."]'

export const clickResourceInEmbedMode = async ({
  page,
  path,
  createIfNotExist = false
}: {
  page: Page
  path: string
  createIfNotExist?: boolean
}): Promise<void> => {
  const paths = path.split('/')
  const frame = page.frameLocator(opencloudFrame)
  await expect(frame.locator('body')).toBeVisible()

  for (const name of paths) {
    const folder = name.replace(/'/g, "\\'").replace(/"/g, '\\"')

    const resource = frame.locator(util.format(resourceNameSelector, folder))
    const resourceExists = await resource.count()

    if (!resourceExists && createIfNotExist) {
      await createNewFolderInEmbedMode({ page, resource: name })
    }

    await resource.waitFor()
    const waitResponse = page.waitForResponse(
      (resp) => resp.status() === 207 && resp.request().method() === 'PROPFIND'
    )
    await resource.click()
    await waitResponse

    await expect(frame.locator('#app-loading-spinner')).toBeHidden()
  }
}

export const selectBatchAction = async (page: Page, action: string): Promise<void> => {
  await page.locator(util.format(filesBatchAction, action)).click()
  await page.mouse.move(0, 0)
}

export const navigateFolderInEmbedMode = async ({
  page,
  parentPath,
  sidebarOnly = false
}: {
  page: Page
  parentPath: string
  sidebarOnly?: boolean
}): Promise<void> => {
  const frame = page.frameLocator(opencloudFrame)
  const parentPathArr = parentPath.split('/')
  const sidebarItem = parentPathArr.shift()

  switch (sidebarItem) {
    case 'Personal': {
      await frame.locator('a[data-nav-name="files-spaces-generic"]').click()
      break
    }
    case 'Project': {
      await frame.locator('a[data-nav-name="files-spaces-projects"]').click()
      break
    }
    case 'Shares': {
      await frame.locator('a[data-nav-name="files-shares"]').click()
      break
    }
    default: {
      // try to open actual resource if the sidebar item is not one of the above
      await clickResourceInEmbedMode({ page, path: sidebarItem })
    }
  }

  if (!sidebarOnly && parentPathArr.length) {
    // navigate the remaining paths
    await clickResourceInEmbedMode({ page, path: parentPathArr.join('/') })
  }
}
