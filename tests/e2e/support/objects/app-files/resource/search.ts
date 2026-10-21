import { Locator, Page, expect } from '@playwright/test'
import util from 'util'
import { appConfig } from '../../../../playwright.config'
import { appLoadingSpinner } from './shared'

const globalSearchInput = '.oc-search-input'
const globalSearchBarFilter = '.oc-search-bar-filter'
const globalSearchDirFilterDropdown =
  '//div[@id="files-global-search"]//button[contains(@id, "oc-filter")]'
const globalSearchBarFilterAllFiles = '//*[@data-test-id="all-files"]'
const globalSearchBarFilterCurrentFolder = '//*[@data-test-id="current-folder"]'
const searchList =
  '//div[@id="files-global-search-options"]//li[contains(@class,"preview")]//span[contains(@class,"oc-resource-name")]'
const globalSearchOptions = '#files-global-search-options'
const loadingSpinner = '#files-global-search-options .loading'
const searchListItem = '#files-global-search span[data-test-resource-name="%s"]'
const sharesNavigationButtonSelector = '.oc-sidebar-nav [data-nav-name="files-shares"]'

export const getResourceSearchItemLocator = ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Locator => {
  return page.locator(util.format(searchListItem, resource))
}

export type searchFilter = 'all files' | 'current folder'

export type SearchShortcutType = 's' | '/'

export interface searchResourceGlobalSearchArgs {
  page: Page
  keyword: string
  filter?: searchFilter
  pressEnter?: boolean
  keyboardShortcut?: SearchShortcutType
}

export const searchResourceGlobalSearch = async (
  args: searchResourceGlobalSearchArgs
): Promise<void> => {
  const { page, keyword, filter, pressEnter, keyboardShortcut } = args
  const searchInputLocator = page.locator(globalSearchInput)

  await page.reload()

  // select the filter if provided
  if (filter) {
    await page.locator(globalSearchDirFilterDropdown).click()
    await page
      .locator(
        filter === 'all files' ? globalSearchBarFilterAllFiles : globalSearchBarFilterCurrentFolder
      )
      .click()
  }

  if (!keyboardShortcut) {
    await page.locator(globalSearchBarFilter).click()
    await page.locator(appLoadingSpinner).waitFor({ state: 'detached' })
  }

  if (!keyword) {
    await searchInputLocator.click()
    await page.keyboard.press('Enter')
    return
  }

  const waitResponse = page.waitForResponse(
    (resp) => resp.status() === 207 && resp.request().method() === 'REPORT'
  )

  if (keyboardShortcut) {
    await expect(searchInputLocator).not.toBeFocused()
    await page.keyboard.press(keyboardShortcut)
    await expect(searchInputLocator).toBeFocused()
    await Promise.all([waitResponse, page.keyboard.type(keyword)])
  } else {
    await Promise.all([waitResponse, searchInputLocator.fill(keyword)])
  }

  await expect(page.locator(globalSearchOptions)).toBeVisible()
  await expect(page.locator(loadingSpinner)).not.toBeVisible()

  if (pressEnter) {
    await page.keyboard.press('Enter')
  }
}

export const clearSearchUsingKeyboardShortcut = async (page: Page): Promise<void> => {
  await page.keyboard.press('Escape')
  const searchInputLocator = page.locator(globalSearchInput)
  await expect(searchInputLocator).toBeFocused()
  await expect(searchInputLocator).toHaveValue('')
}

export type displayedResourceType = 'search list' | 'files list' | 'Shares' | 'trashbin'

export interface getDisplayedResourcesArgs {
  keyword: displayedResourceType
  page: Page
}

export const getDisplayedResourcesFromSearch = async (page: Page): Promise<string[]> => {
  const result = await page.locator(searchList).allInnerTexts()
  // the result has values like `test\n.txt` so remove new line
  return result.map((result) => result.replace('\n', ''))
}

export const getDisplayedResourcesFromFilesList = async (page: Page): Promise<string[]> => {
  // wait for tika indexing
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const files = []
  const result = page.locator('[data-test-resource-path]')

  try {
    await result.first().waitFor({ timeout: appConfig.minTimeout * 1000 })
  } catch {
    console.log('Files list is empty')
  }

  const count = await result.count()
  for (let i = 0; i < count; i++) {
    files.push(await result.nth(i).getAttribute('data-test-resource-name'))
  }

  return files
}

export const getDisplayedResourcesFromShares = async (page: Page): Promise<string[]> => {
  const files = []
  await page.locator(sharesNavigationButtonSelector).click()
  const result = page.locator('[data-test-resource-path]')

  const count = await result.count()
  for (let i = 0; i < count; i++) {
    files.push(await result.nth(i).getAttribute('data-test-resource-name'))
  }

  return files
}

export const getDisplayedResourcesFromTrashbin = async (page: Page): Promise<string[]> => {
  const files = []
  const result = page.locator('[data-test-resource-path]')
  try {
    await result.first().waitFor({ timeout: appConfig.minTimeout * 1000 })
  } catch {
    console.log('Trashbin is empty')
  }

  const count = await result.count()
  for (let i = 0; i < count; i++) {
    files.push(await result.nth(i).getAttribute('data-test-resource-name'))
  }

  return files
}
