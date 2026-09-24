import { Page, expect } from '@playwright/test'
import util from 'util'
import path from 'path'
import { waitForResources } from './utils'
import { utils } from '../../../../support'
import { appConfig } from '../../../../playwright.config'
import { File } from '../../../types'
import { state } from '../../../../environment/shared'
import { lstatSync, readFileSync } from 'fs'
import {
  actionConfirmationButton,
  actionSecondaryConfirmationButton,
  addNewResourceButton,
  clickResource,
  filesView,
  notificationMessageDialog,
  resourceNameSelector
} from './shared'

const fileUploadInput = '#files-file-upload-input'
const folderUploadInput = '#files-folder-upload-input'
const uploadInfoCloseButton = '#close-upload-info-btn'
const uploadErrorCloseButton = '.oc-notification-message-danger button[aria-label="Close"]'
const actionSkipButton = '.oc-modal-body-actions-cancel'
const uploadInfoSuccessLabelSelector = '.upload-info-label.upload-info-success'
const uploadInfoTitle = '.upload-info-title'
const uploadInfoLabelSelector = '.upload-info-label'
const pauseResumeUploadButton = '#pause-upload-info-btn'
const pauseUploadButton = '#pause-upload-info-btn[aria-label="Pause upload"]'
const resumeUploadButton = '#pause-upload-info-btn[aria-label="Resume upload"]'
const cancelUploadButton = '#cancel-upload-info-btn'
const uploadList = '#upload-list'
/**/

export interface uploadResourceArgs {
  page: Page
  resources: File[]
  to?: string
  option?: string
  error?: string
  expectToFail?: boolean
  type?: string
  password?: string
}

const performUpload = async (args: uploadResourceArgs): Promise<void> => {
  const { page, resources, to, option, error, expectToFail, type, password } = args
  if (to) {
    await clickResource({ page, path: to, password })
  }

  // an upload that is expected to fail may never produce a 2xx response,
  // a dangling waitForResponse would then reject when the page closes
  const respPromise = expectToFail
    ? Promise.resolve()
    : page.waitForResponse(
        (resp) =>
          [201, 204].includes(resp.status()) &&
          ['POST', 'PUT', 'PATCH'].includes(resp.request().method())
      )

  const inputSelector = type === 'folder' ? folderUploadInput : fileUploadInput
  let uploadAction: Promise<void> = page
    .locator(inputSelector)
    .setInputFiles(resources.map((file) => file.path))

  await page.locator(addNewResourceButton).click()
  await expect(page.locator(uploadList)).toBeVisible()

  if (option) {
    await uploadAction

    switch (option) {
      case 'skip': {
        await page.locator(actionSkipButton).click()
        return
      }
      case 'merge':
      case 'replace': {
        uploadAction = page.locator(actionSecondaryConfirmationButton).click()
        break
      }
      case 'keep both': {
        uploadAction = page.locator(util.format(actionConfirmationButton, 'Keep both')).click()
        break
      }
    }
  }

  if (expectToFail) {
    expect(await page.locator(notificationMessageDialog).textContent()).toBe(error)
    return
  }

  if (password) {
    const capturedBodies: Buffer[] = []

    await page.route('**/dav/spaces/**', async (route) => {
      const body = route.request().postDataBuffer()
      if (body && body.length > 0) {
        capturedBodies.push(body)
      }
      await route.continue()
    })

    await uploadAction
    await respPromise

    await page.unroute('**/dav/spaces/**')

    // check that the uploaded content is encrypted by rclone crypt and not the original content
    const encryptedRequest = capturedBodies.find(
      (b) => b.subarray(0, 6).toString('ascii') === 'RCLONE'
    )
    expect(encryptedRequest).not.toBeUndefined()

    const originalContent = readFileSync(resources[0].path)
    expect(encryptedRequest!.equals(originalContent)).toBe(false)
  } else {
    await uploadAction
    await respPromise
  }
}

export const uploadLargeNumberOfResources = async (args: uploadResourceArgs): Promise<void> => {
  const { page, resources } = args
  await performUpload(args)
  await page.locator(uploadInfoCloseButton).waitFor()
  await expect(page.locator(uploadInfoSuccessLabelSelector)).toHaveText(
    `${resources.length} files uploaded`,
    { timeout: appConfig.timeout * 1000 }
  )
}

export const uploadResource = async (args: uploadResourceArgs): Promise<void> => {
  const { page, resources, option } = args

  await performUpload(args)

  if (
    option !== 'skip' &&
    state.projectName !== 'mobile-chromium' &&
    state.projectName !== 'mobile-webkit'
  ) {
    await page.locator(uploadInfoCloseButton).click()
  }

  await waitForResources({
    page,
    names: resources.map((file) => path.basename(file.name))
  })
}

export const tryToUploadResource = async (args: uploadResourceArgs): Promise<void> => {
  const { page } = args
  await performUpload({ ...args, expectToFail: true })
  await page.locator(uploadErrorCloseButton).click()
}

export const dropUploadFiles = async (args: uploadResourceArgs): Promise<void> => {
  const { page, resources, password } = args

  // waiting to files view
  await expect(page.locator(addNewResourceButton)).not.toHaveAttribute('disabled')

  const isDir = resources.some((resource) => lstatSync(resource.path).isDirectory())
  const performDrop = (): Promise<void> =>
    isDir || state.projectName === 'webkit'
      ? utils.dragDropFolder(page, resources, filesView)
      : page.locator(filesView).drop({ files: resources.map((resource) => resource.path) })

  if (password) {
    const capturedBodies: Buffer[] = []

    await page.route('**/dav/spaces/**', async (route) => {
      const body = route.request().postDataBuffer()
      if (body && body.length > 0) {
        capturedBodies.push(body)
      }
      await route.continue()
    })

    const respPromise = page.waitForResponse(
      (resp) =>
        [201, 204].includes(resp.status()) &&
        ['POST', 'PUT', 'PATCH'].includes(resp.request().method())
    )

    await performDrop()
    await respPromise

    await page.unroute('**/dav/spaces/**')

    const encryptedRequest = capturedBodies.find(
      (b) => b.subarray(0, 6).toString('ascii') === 'RCLONE'
    )
    expect(encryptedRequest).not.toBeUndefined()
  } else {
    await performDrop()
  }

  await page.locator(uploadInfoCloseButton).click()
  await Promise.all(
    resources.map((file) =>
      page.locator(util.format(resourceNameSelector, path.basename(file.name))).waitFor()
    )
  )
}
// uploads the file without other checks
export const startResourceUpload = (args: uploadResourceArgs): Promise<void> => {
  return performUpload(args)
}

const pauseResumeUpload = (page: Page): Promise<void> => {
  return page.locator(pauseResumeUploadButton).click()
}

export const pauseResourceUpload = async (page: Page): Promise<void> => {
  await pauseResumeUpload(page)
  await page.locator(resumeUploadButton).waitFor()
}

export const resumeResourceUpload = async (page: Page): Promise<void> => {
  await pauseResumeUpload(page)
  await page.locator(pauseUploadButton).waitFor()

  await page
    .locator(uploadInfoSuccessLabelSelector)
    .waitFor({ timeout: appConfig.largeUploadTimeout * 1000 })

  await page.locator(uploadInfoCloseButton).click()
}

export const cancelResourceUpload = async (page: Page): Promise<void> => {
  await page.locator(cancelUploadButton).click()
  await expect(page.locator(uploadInfoTitle)).toHaveText('Upload cancelled')
  await expect(page.locator(uploadInfoLabelSelector)).toHaveText('0 items uploaded')
}

export const uploadImageFromClipboard = async ({ page }: { page: Page }): Promise<void> => {
  // We use a screenshot of the current page to simulate clipboard image content,
  // since direct clipboard access is not available in Playwright tests.
  const buffer = await page.screenshot()

  await page.locator(addNewResourceButton).click()
  const fileInput = await page.locator(fileUploadInput)
  await fileInput.setInputFiles({
    name: 'image.png',
    mimeType: 'image/png',
    buffer: buffer
  })
  await page.keyboard.press('Escape')
}
