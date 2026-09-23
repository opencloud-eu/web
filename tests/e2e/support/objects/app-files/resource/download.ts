import { Download, Page, expect } from '@playwright/test'
import { sidebar } from '../utils'
import {
  ActionViaType,
  appBarContextMenu,
  clickResource,
  resourceArgs,
  selectOrDeselectResources
} from './shared'

const downloadFileButtonSingleShareView = '.oc-files-actions-download-file-trigger'
const downloadFolderButtonSingleShareView = '.oc-files-actions-download-archive-trigger'
const downloadFileButtonSideBar =
  '#oc-files-actions-sidebar .oc-files-actions-download-file-trigger'
const downloadFolderButtonSideBar =
  '#oc-files-actions-sidebar .oc-files-actions-download-archive-trigger'
const downloadButtonBatchAction = '.oc-files-actions-download-archive-trigger'
const appBarDownloadFileButton = '#oc-openfile-contextmenu .oc-files-actions-download-file-trigger'

export interface downloadResourcesArgs {
  page: Page
  resources: resourceArgs[]
  folder?: string
  via: ActionViaType
}

export const downloadResources = async (args: downloadResourcesArgs): Promise<Download[]> => {
  const { page, resources, folder, via } = args
  const downloads = []

  switch (via) {
    case 'SIDEBAR_PANEL': {
      if (folder) {
        await clickResource({ page, path: folder })
      }
      for (const resource of resources) {
        await sidebar.open({ page, resource: resource.name })
        await sidebar.openPanel({ page, name: 'actions' })
        const downloadResourceSelector =
          resource.type === 'file' ? downloadFileButtonSideBar : downloadFolderButtonSideBar
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.locator(downloadResourceSelector).click()
        ])

        await sidebar.close({ page })

        downloads.push(download)
      }
      break
    }

    case 'BATCH_ACTION': {
      await selectOrDeselectResources({ page, resources, folder, select: true })
      if (resources.length === 1) {
        throw new Error('Single resource cannot be downloaded with batch action')
      }
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator(downloadButtonBatchAction).click()
      ])
      downloads.push(download)
      break
    }

    case 'SINGLE_SHARE_VIEW': {
      if (folder) {
        await clickResource({ page, path: folder })
      }
      for (const resource of resources) {
        const downloadResourceSelector =
          resource.type === 'file'
            ? downloadFileButtonSingleShareView
            : downloadFolderButtonSingleShareView
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.locator(downloadResourceSelector).click()
        ])

        downloads.push(download)
      }
      break
    }

    case 'PREVIEW_TOPBAR':
      const downloadButtonPromise = page.locator(appBarDownloadFileButton).waitFor()
      await page.locator(appBarContextMenu).click()
      await downloadButtonPromise

      const downloadPromise = page.waitForEvent('download')
      await page.locator(appBarDownloadFileButton).click()
      const download = await downloadPromise
      downloads.push(download)
      break
  }

  return downloads
}

export const getDownloadButtonTooltip = async ({ page }: { page: Page }): Promise<string> => {
  const downloadButton = page.locator(downloadButtonBatchAction)
  await expect(downloadButton).toBeDisabled()
  return await downloadButton.getAttribute('aria-label')
}
