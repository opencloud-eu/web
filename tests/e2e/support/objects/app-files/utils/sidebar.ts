import { Page, expect } from '@playwright/test'
import util from 'util'
import { locatorUtils } from '../../../utils'

const contextMenuSelector = `
//button[
  @data-test-context-menu-resource-name="%s" and
  (contains(@class, "resource-tiles-btn-action-dropdown") or
   contains(@class, "resource-table-btn-action-dropdown"))
]
`
const contextMenu = '#oc-files-context-menu'
const closeSidebarRootPanelBtn = `#app-sidebar .is-active-root-panel .header__close`
const closeSidebarSubPanelBtn = `#app-sidebar .is-active-sub-panel .header__close`

const openForResource = async ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Promise<void> => {
  await page.locator(util.format(contextMenuSelector, resource)).waitFor()
  await page.locator(util.format(contextMenuSelector, resource)).click()
  await page.locator(contextMenu).waitFor()
  await page.locator(contextMenu).locator('.oc-files-actions-show-details-trigger').click()
}

export const openPanelForResource = async ({
  page,
  resource,
  panel
}: {
  page: Page
  resource: string
  panel: string
}): Promise<void> => {
  await page.locator(util.format(contextMenuSelector, resource)).waitFor()
  await page.locator(util.format(contextMenuSelector, resource)).click()
  await page.locator(contextMenu).waitFor()
  await page.locator(contextMenu).locator(`.oc-files-actions-show-${panel}-trigger`).click()
}

const openGlobal = async ({ page }: { page: Page }): Promise<void> => {
  await page.locator('#files-toggle-sidebar').click()
}

export const open = async ({
  page,
  resource
}: {
  page: Page
  resource?: string
}): Promise<void> => {
  if (await page.locator('#app-sidebar').count()) {
    await Promise.all([
      page.locator('#app-sidebar').waitFor({ state: 'detached' }),
      close({ page })
    ])
  }

  resource ? await openForResource({ page, resource }) : await openGlobal({ page })
}

export const close = async ({ page }: { page: Page }): Promise<void> => {
  const subPanelBtn = page.locator(closeSidebarSubPanelBtn)
  const rootPanelBtn = page.locator(closeSidebarRootPanelBtn)
  await expect(subPanelBtn.or(rootPanelBtn)).toBeVisible()
  await subPanelBtn.or(rootPanelBtn).click()
}

export const openPanel = async ({ page, name }: { page: Page; name: string }): Promise<void> => {
  const currentPanel = page.locator('.sidebar-panel.is-active')
  const backButton = currentPanel.locator('.header__back')

  if (await backButton.count()) {
    await Promise.all([
      locatorUtils.waitForEvent(currentPanel, 'transitionend'),
      backButton.click()
    ])
  }
  const panelSelector = page.locator(`#sidebar-panel-${name}-select`)
  const nextPanel = page.locator(`#sidebar-panel-${name}`)
  await Promise.all([
    page.locator('div.oc-loader').waitFor({ state: 'detached' }),
    locatorUtils.waitForEvent(nextPanel, 'transitionend'),
    panelSelector.click()
  ])
  await nextPanel.waitFor()
}
