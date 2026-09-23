import { Page } from '@playwright/test'
import util from 'util'
import path from 'path'
import { sidebar } from '../utils'
import { clickResource } from './shared'

const tagTableCell =
  '//*[@data-test-resource-name="%s"]/ancestor::tr//td[contains(@class, "oc-table-data-cell-tags")]'
const tagInFilesTable = '//*[contains(@class, "oc-tag")]//span[text()="%s"]//ancestor::a'
const tagInInputForm =
  '//span[contains(@class, "tags-select-tag")]//span[text()="%s"]//ancestor::span//button[contains(@class, "vs__deselect")]'
const tagFormInput = '//*[@data-testid="tags"]//input'

export interface resourceTagsArgs {
  page: Page
  resource: string
  tags: string[]
}

export interface clickTagArgs {
  resource: string
  tag: string
  page: Page
}

export const getTagsForResourceVisibilityInFilesTable = async (
  args: resourceTagsArgs
): Promise<boolean> => {
  const { page, resource, tags } = args
  const { dir: resourceDir } = path.parse(resource)

  const folderPaths = resource.split('/')
  const resourceName = folderPaths.pop()

  if (resourceDir) {
    await clickResource({ page, path: resourceDir })
  }

  const tagCellSelector = util.format(tagTableCell, resourceName)
  await page.locator(tagCellSelector).waitFor()
  const resourceTagCell = page.locator(tagCellSelector)

  for (const tag of tags) {
    const tagSpan = resourceTagCell.locator(util.format(tagInFilesTable, tag))
    const isVisible = await tagSpan.isVisible()
    if (!isVisible) {
      return false
    }
  }

  return true
}

export const clickResourceTag = async (args: clickTagArgs): Promise<void> => {
  const { page, resource, tag } = args
  const { dir: resourceDir } = path.parse(resource)

  const folderPaths = resource.split('/')
  const resourceName = folderPaths.pop()

  if (resourceDir) {
    await clickResource({ page, path: resourceDir })
  }

  const tagCellSelector = util.format(tagTableCell, resourceName)
  await page.locator(tagCellSelector).waitFor()
  const resourceTagCell = page.locator(tagCellSelector)
  const tagSpan = resourceTagCell.locator(util.format(tagInFilesTable, tag))
  return tagSpan.click()
}

export const getTagsForResourceVisibilityInDetailsPanel = async (
  args: resourceTagsArgs
): Promise<boolean> => {
  const { page, resource, tags } = args
  const { dir: resourceDir } = path.parse(resource)

  const folderPaths = resource.split('/')
  const resourceName = folderPaths.pop()

  if (resourceDir) {
    await clickResource({ page, path: resourceDir })
  }

  await sidebar.open({ page: page, resource: resourceName })

  for (const tag of tags) {
    const tagSelector = page.getByRole('link', { name: tag })
    await tagSelector.waitFor()
    const isVisible = await tagSelector.isVisible()
    if (!isVisible) {
      return false
    }
  }

  return true
}

export const addTagsToResource = async (args: resourceTagsArgs): Promise<void> => {
  const { page, resource, tags } = args
  const { dir: resourceDir } = path.parse(resource)

  const folderPaths = resource.split('/')
  const resourceName = folderPaths.pop()

  if (resourceDir) {
    await clickResource({ page, path: resourceDir })
  }

  await sidebar.open({ page: page, resource: resourceName })
  const inputForm = page.locator(tagFormInput)

  for (const tag of tags) {
    await inputForm.pressSequentially(tag)

    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().endsWith('tags') && resp.status() === 200 && resp.request().method() === 'PUT'
      ),

      page.locator('.vs__dropdown-option').first().press('Enter')
    ])
  }

  await sidebar.close({ page })
}

export const removeTagsFromResource = async (args: resourceTagsArgs): Promise<void> => {
  const { page, resource, tags } = args
  const { dir: resourceDir } = path.parse(resource)

  const folderPaths = resource.split('/')
  const resourceName = folderPaths.pop()

  if (resourceDir) {
    await clickResource({ page, path: resourceDir })
  }

  await sidebar.open({ page: page, resource: resourceName })

  for (const tag of tags) {
    await page.locator(util.format(tagInInputForm, tag)).click()
  }
  await sidebar.close({ page })
}
