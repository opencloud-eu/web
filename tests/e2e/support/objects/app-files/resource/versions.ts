import { Page, expect } from '@playwright/test'
import path from 'path'
import { sidebar } from '../utils'
import { File } from '../../../types'
import { clickResource } from './shared'

const versionRevertButton = '//*[@data-testid="file-versions-revert-button"]'
const versionsPanelSelect = '//*[@data-testid="sidebar-panel-versions-select"]'
/**/

export interface resourceVersionArgs {
  page: Page
  files: File[]
  folder?: string
  openDetailsPanel?: boolean
}

export const restoreResourceVersion = async (args: resourceVersionArgs) => {
  const { page, files, folder, openDetailsPanel } = args
  if (openDetailsPanel) {
    const fileName = files.map((file) => path.basename(file.name))
    await clickResource({ page, path: folder })
    await sidebar.open({ page, resource: fileName[0] })
    await sidebar.openPanel({ page, name: 'versions' })
  }
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().includes('/v/') && resp.status() === 204 && resp.request().method() === 'COPY'
    ),
    page.locator(versionRevertButton).first().click()
  ])
}

export interface downloadResourceVersionArgs {
  page: Page
  files: File[]
  folder?: string
}

export const downloadResourceVersion = async (args: downloadResourceVersionArgs) => {
  const { page, files, folder } = args
  const fileName = files.map((file) => path.basename(file.name))
  await clickResource({ page, path: folder })
  await sidebar.open({ page, resource: fileName[0] })
  await sidebar.openPanel({ page, name: 'versions' })
  await Promise.all([
    page.waitForEvent('download'),
    page.locator('//*[@data-testid="file-versions-download-button"]').first().click()
  ])
  await sidebar.close({ page: page })
}

export const checkThatFileVersionPanelIsNotAvailable = async (
  args: resourceVersionArgs
): Promise<void> => {
  const { page, files, folder } = args
  const fileName = files.map((file) => path.basename(file.name))
  await clickResource({ page, path: folder })
  await sidebar.open({ page, resource: fileName[0] })

  await expect(page.locator(versionsPanelSelect)).not.toBeVisible()
}
