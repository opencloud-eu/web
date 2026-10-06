import { expect, Locator, Page } from '@playwright/test'
import util from 'util'

const searchResultMessageSelector = '//p[@class="text-role-on-surface-variant"]'
const selectTagDropdownSelector =
  '//div[contains(@class,"files-search-filter-tags")]//button[contains(@class,"oc-filter-chip-button")]'
const tagFilterChipSelector = '//button[contains(@data-test-value,"%s")]'
const mediaTypeFilterSelector = '.item-filter-mediaType'
const mediaTypeFilterItem = '[data-test-id="media-type-%s"]'
const mediaTypeOutside = '.files-search-result-filter'
const clearFilterSelector = '.item-filter-%s .oc-filter-chip-clear'
const lastModifiedFilterSelector = '.item-filter-lastModified'
const lastModifiedFilterItem = '[data-test-value="%s"]'
const enableSearchTitleOnlySelector =
  '//div[contains(@class,"files-search-filter-title-only")]//button[contains(@class,"oc-filter-chip-button")]'
const disableSearchTitleOnlySelector =
  '//div[contains(@class,"files-search-filter-title-only")]//button[contains(@class,"oc-filter-chip-clear")]'
const locationSearchPanelSelector = '//*[@data-testid="search-bar-filter"]'
const searchResultItemSelector =
  '//*[@data-test-resource-name="%s"]/ancestor::*[self::tr or contains(@class, "oc-tile-card")][1]'
const searchPreviewItemSelector =
  '//div[@id="files-global-search-options"]//*[@data-test-resource-name="%s"]/ancestor::li[contains(@class, "preview")]'
const foundContentSelector = '.search-highlights-content'
const foundContentMatchSelector = '.search-highlights-content mark'
const matchingTagSelector = '.search-highlights-tag'

export type searchResultLocation = 'search results' | 'search preview'

export const getSearchResultMessage = ({ page }: { page: Page }): Promise<string> => {
  return page.locator(searchResultMessageSelector).innerText()
}

export const selectTagFilter = async ({
  tag,
  page
}: {
  tag: string
  page: Page
}): Promise<void> => {
  const dropdown = page.locator(selectTagDropdownSelector)
  const tagOption = page.locator(util.format(tagFilterChipSelector, tag))
  // the filter is always visible, but its tags are only fetched on page load
  // and a freshly added tag might not be indexed yet
  let attempt = 0
  await expect(async () => {
    if (attempt++ > 0) {
      await page.reload()
    }
    await dropdown.click({ timeout: 5000 })
    await expect(tagOption).toBeVisible({ timeout: 5000 })
  }).toPass({ timeout: 30000 })

  await tagOption.click()
}

export const selectMediaTypeFilter = async ({
  mediaType,
  page
}: {
  mediaType: string
  page: Page
}): Promise<void> => {
  await page.locator(mediaTypeFilterSelector).click()
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().includes('/dav/spaces') &&
        resp.status() === 207 &&
        resp.request().method() === 'REPORT'
    ),
    page.locator(util.format(mediaTypeFilterItem, mediaType.toLowerCase())).click()
  ])
  await page.locator(mediaTypeOutside).click()
}

export const selectLastModifiedFilter = async ({
  lastModified,
  page
}: {
  lastModified: string
  page: Page
}): Promise<void> => {
  await page.locator(lastModifiedFilterSelector).click()
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().includes('/dav/spaces') &&
        resp.status() === 207 &&
        resp.request().method() === 'REPORT'
    ),
    page.locator(util.format(lastModifiedFilterItem, lastModified)).click()
  ])
}

export const clearFilter = async ({
  page,
  filter
}: {
  page: Page
  filter: string
}): Promise<void> => {
  await page.locator(util.format(clearFilterSelector, filter)).click()
}

export const toggleSearchTitleOnly = async ({
  enableOrDisable,
  page
}: {
  enableOrDisable: string
  page: Page
}): Promise<void> => {
  const selector =
    enableOrDisable === 'enable' ? enableSearchTitleOnlySelector : disableSearchTitleOnlySelector
  await page.locator(selector).click()
}

export const openLocationSearchPanel = async ({ page }: { page: Page }): Promise<void> => {
  await page.locator(locationSearchPanelSelector).click()
}

const getSearchResultItem = ({
  page,
  resource,
  location
}: {
  page: Page
  resource: string
  location: searchResultLocation
}): Locator => {
  const selector =
    location === 'search preview' ? searchPreviewItemSelector : searchResultItemSelector
  return page.locator(util.format(selector, resource))
}

export const getFoundContentMatch = async ({
  page,
  resource,
  location
}: {
  page: Page
  resource: string
  location: searchResultLocation
}): Promise<{ match: string; isFullyVisible: boolean }> => {
  const item = getSearchResultItem({ page, resource, location })
  const match = item.locator(foundContentMatchSelector).first()
  await expect(match).toBeVisible()
  // the found content is cut off to one line, the match must neither be clipped nor covered by the ellipsis
  const isFullyVisible = await match.evaluate((mark, contentSelector) => {
    const markRect = mark.getBoundingClientRect()
    const content = mark.closest(contentSelector).getBoundingClientRect()
    const matchPart = mark.parentElement
    const matchPartRect = matchPart.getBoundingClientRect()
    const ellipsisWidth = matchPart.scrollWidth > matchPart.clientWidth ? 14 : 0
    const visibleRight = Math.min(content.right, matchPartRect.right) - ellipsisWidth
    return markRect.left >= content.left - 0.5 && markRect.right <= visibleRight + 0.5
  }, foundContentSelector)
  return { match: await match.innerText(), isFullyVisible }
}

export const getMatchingTags = ({
  page,
  resource,
  location
}: {
  page: Page
  resource: string
  location: searchResultLocation
}): Promise<string[]> => {
  return getSearchResultItem({ page, resource, location })
    .locator(matchingTagSelector)
    .allInnerTexts()
}

export const getFoundContentAndMatchingTagsCount = ({
  page,
  resource,
  location
}: {
  page: Page
  resource: string
  location: searchResultLocation
}): Promise<number> => {
  return getSearchResultItem({ page, resource, location })
    .locator(`${foundContentSelector}, ${matchingTagSelector}`)
    .count()
}
