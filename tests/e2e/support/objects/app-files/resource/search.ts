import { Locator, Page, expect } from '@playwright/test'
import util from 'util'
import { appLoadingSpinner } from './shared'

const globalSearchInput = '.oc-search-input'
const globalSearchBarFilter = '.oc-search-bar-filter'
const globalSearchDirFilterDropdown =
  '//div[@id="files-global-search"]//button[contains(@id, "oc-filter")]'
const globalSearchBarFilterAllFiles = '//*[@data-test-id="all-files"]'
const globalSearchBarFilterCurrentFolder = '//*[@data-test-id="current-folder"]'
const globalSearchOptions = '#files-global-search-options'
const loadingSpinner = '#files-global-search-options .loading'
const searchListItem = '#files-global-search span[data-test-resource-name="%s"]'

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
