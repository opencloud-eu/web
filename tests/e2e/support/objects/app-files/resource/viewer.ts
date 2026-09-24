import { Locator, Page, expect } from '@playwright/test'
import util from 'util'
import path from 'path'
import { editor, sidebar } from '../utils'
import { appConfig } from '../../../../playwright.config'
import { waitProcessingToFinish } from '../fileEvents'
import { encodeWebDavPath } from '../../../utils'
import {
  appBarContextMenu,
  collaboraDocTextAreaSelector,
  euroOfficeDocTextAreaSelector,
  euroOfficeInnerFrameSelector,
  euroOfficeSaveButtonSelector,
  externalEditorIframe,
  navigateFolderInEmbedMode,
  openWithButton,
  opencloudFrame,
  resourceNameSelector,
  sideBarActionButton
} from './shared'

const topbarFilenameSelector = '#app-top-bar-resource .oc-resource-name'
const appBarSaveAsButton = '#oc-openfile-contextmenu .oc-files-actions-save-as-trigger'
const saveTextFileInEditorButton = '#app-save-action:visible'
const textEditorPlainTextInput = '.text-editor-provider .ProseMirror'
const previewImage = '//main[@id="preview"]//div[contains(@class,"stage_media")]//img'
const previewAudio = '//main[@id="preview"]//div[contains(@class,"stage_media")]//audio//source'
const previewVideo = '//main[@id="preview"]//div[contains(@class,"stage_media")]//video//source'
const previewControlsCount = '.preview-controls-action-count > :first-child'
const resourceLockIcon =
  '//*[@data-test-resource-name="%s"]/ancestor::*[self::li or self::tr]//span[@data-test-indicator-type="resource-locked"]'
const resourceMotionPhotoBadge =
  '//*[@data-test-resource-name="%s"]/ancestor::*[contains(@class, "oc-tile-card") or contains(@class, "oc-tbody-tr")]//*[@data-testid="motion-photo-badge"]'
const previewMotionPhotoBadge =
  '//*[contains(@class, "photo-roll-item")][.//*[@data-test-resource-name="%s"]]//*[@data-testid="motion-photo-badge"]'
const mediaNavigationButton = `//button[contains(@class, "preview-controls-%s")]`
// file viewer
const pdfViewerContainer = '#pdf-viewer .pdf-viewer'
const textEditorContainer = '.text-editor-provider .ProseMirror'
// online office locators
// Collabora
const collaboraDocPermissionModeSelector = '#permissionmode-container'
const collaboraCanvasEditorSelector = '#document-canvas'
const euroOfficeCanvasEditorSelector = '#id_viewer_overlay'
const euroOfficeCanvasCursorSelector = '#id_target_cursor'
const euroOfficeInfoDialog = '.alert .info-box'
const euroOfficeInfoDialogConfirm = `.alert button[result="ok"]`
const fileThumbnail = `//img[@data-test-thumbnail-resource-name="%s"]`
const fileIcon = '#oc-file-details-sidebar .details-icon'
const fileIconPreview = '#oc-file-details-sidebar .details-preview'
const openWithAction = '.oc-files-actions-%s-trigger'

export const fillContentOfDocument = async ({
  page,
  text,
  editorToOpen
}: {
  page: Page
  text: string
  editorToOpen: string
}): Promise<void> => {
  const editorMainFrame = page.frameLocator(externalEditorIframe)
  switch (editorToOpen) {
    case 'TextEditor':
      await page.locator(textEditorPlainTextInput).fill(text)
      break
    case 'Collabora':
      await editorMainFrame.locator(collaboraDocTextAreaSelector).focus()
      await page.keyboard.press('ControlOrMeta+A')
      await editorMainFrame.locator(collaboraDocTextAreaSelector).fill(text)
      break
    case 'Euro-Office':
      const innerIframe = editorMainFrame.frameLocator(euroOfficeInnerFrameSelector)
      await innerIframe.locator(euroOfficeDocTextAreaSelector).focus()
      await page.keyboard.press('ControlOrMeta+A')
      await innerIframe.locator(euroOfficeDocTextAreaSelector).fill(text)
      break
    default:
      throw new Error("Editor should be 'TextEditor' but found " + editorToOpen)
  }
}
const mentionMenuSelector = '.text-editor-mention-menu'
const mentionMenuItemSelector = '.text-editor-mention-menu__item'
const mentionHighlightSelector = '.text-editor-mention'

export const mentionUserInDocument = async ({
  page,
  user
}: {
  page: Page
  user: string
}): Promise<void> => {
  await page.locator(textEditorPlainTextInput).click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(' @')
  await page.keyboard.type(user.split(' ')[0])

  const mentionMenu = page.locator(mentionMenuSelector)
  await mentionMenu.waitFor()
  await mentionMenu
    .locator(mentionMenuItemSelector, { has: page.locator(`[data-test-user-name="${user}"]`) })
    .click()

  await expect(page.locator(mentionHighlightSelector, { hasText: `@${user}` })).toBeVisible()
}

export const openAndGetContentOfDocument = async ({
  page,
  editorToOpen
}: {
  page: Page
  editorToOpen: string
}): Promise<string> => {
  if (editorToOpen === 'TextEditor') {
    const editor = page.locator('.tiptap.ProseMirror')
    await expect(editor).toBeVisible()
    return await editor.innerText()
  }
  await page.waitForLoadState()
  await page.waitForURL(/.*\/external-.*/)
  const editorMainFrame = page.frameLocator(externalEditorIframe)
  switch (editorToOpen) {
    case 'CollaboraOnline':
      await editorMainFrame.locator(collaboraCanvasEditorSelector).click()
      break
    case 'Euro-Office':
      const innerFrame = editorMainFrame.frameLocator(euroOfficeInnerFrameSelector)
      await innerFrame.locator(euroOfficeCanvasEditorSelector).click()
      await innerFrame.locator(euroOfficeCanvasCursorSelector).waitFor()
      break
    default:
      throw new Error(
        "Editor should be either 'Collabora' or 'Euro-Office' but found " + editorToOpen
      )
  }
  return await tryCopyClipboard(page)
}

const tryCopyClipboard = async (page: Page, maxRetries = 5): Promise<string> => {
  for (let i = 0; i < maxRetries; i++) {
    await page.evaluate(() => navigator.clipboard.writeText(''))
    await page.waitForTimeout(200)
    await page.keyboard.press('ControlOrMeta+A', { delay: 100 })
    await page.keyboard.press('ControlOrMeta+C', { delay: 100 })
    const text = await page.evaluate(() => navigator.clipboard.readText())
    if (text.trim().length > 0) return text
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')
  }
  throw new Error('Failed to read non-empty clipboard content after retries')
}

export const editTextDocument = async ({
  page,
  name,
  content,
  password
}: {
  page: Page
  name: string
  content: string
  password?: string
}): Promise<void> => {
  await page.locator(textEditorPlainTextInput).fill(content)
  const [putRequest] = await Promise.all([
    page.waitForResponse((resp) => resp.status() === 204 && resp.request().method() === 'PUT'),
    page.waitForResponse((resp) => resp.status() === 207 && resp.request().method() === 'PROPFIND'),
    page.locator(saveTextFileInEditorButton).click()
  ])

  // in vault case where we need set password, check that body request data is encrypted
  const bodyBuffer = putRequest.request().postDataBuffer()
  if (password) {
    expect(bodyBuffer).not.toBeNull()
    // rclone crypt magic header
    const magic = bodyBuffer!.subarray(0, 6).toString('ascii')
    expect(magic).toBe('RCLONE')
    expect(bodyBuffer!.toString('utf-8')).not.toContain(content)
  }
  await editor.close(page)
  await expect(page.locator(util.format(resourceNameSelector, name))).toBeVisible()
}

export const navigateMediaFile = async ({
  page,
  navigationType
}: {
  page: Page
  navigationType: string
}): Promise<void> => {
  const oldFileInMediaViewer = await page
    .locator(topbarFilenameSelector)
    .getAttribute('data-test-resource-name')

  await page.locator(util.format(mediaNavigationButton, navigationType)).click()
  const fileViewerLocator = editor.fileViewerLocator({ page, fileViewerType: 'media-viewer' })
  await expect(fileViewerLocator).toBeVisible()

  const currentFileInMediaViewer = await page
    .locator(topbarFilenameSelector)
    .getAttribute('data-test-resource-name')
  expect(currentFileInMediaViewer).not.toEqual(oldFileInMediaViewer)
}

export interface openFileInViewerArgs {
  page: Page
  name: string
  actionType:
    'mediaviewer' | 'audioviewer' | 'pdfviewer' | 'texteditor' | 'Collabora' | 'Euro-Office'
  verifyPropfindPath?: boolean
}

export const openFileInViewer = async (args: openFileInViewerArgs): Promise<void> => {
  const { page, name, actionType, verifyPropfindPath = false } = args
  await waitProcessingToFinish(page, name)

  switch (actionType) {
    case 'Euro-Office':
      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes(`app_name=${actionType}`) &&
            resp.status() === 200 &&
            resp.request().method() === 'POST'
        ),
        page.locator(util.format(resourceNameSelector, name)).click()
      ])

      const euroOfficeIframe = page
        .frameLocator(externalEditorIframe)
        .frameLocator(euroOfficeInnerFrameSelector)

      // wait for the iframe to load
      await euroOfficeIframe.locator('div#viewport').waitFor()

      // close the info dialog if visible
      try {
        await euroOfficeIframe
          .locator(euroOfficeInfoDialog)
          .waitFor({ timeout: appConfig.minTimeout * 1000 })
        await euroOfficeIframe.locator(euroOfficeInfoDialogConfirm).click()
        // NOTE: page reload is required if the info dialog appears
        await page.reload()
      } catch {
        console.log('No info dialog. Continue...')
      }

      await euroOfficeIframe.locator(euroOfficeDocTextAreaSelector).waitFor()
      break
    case 'Collabora':
      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes(`app_name=${actionType}`) &&
            resp.status() === 200 &&
            resp.request().method() === 'POST'
        ),
        page.locator(util.format(resourceNameSelector, name)).click()
      ])
      break
    case 'mediaviewer': {
      if (verifyPropfindPath) {
        // shared files opened via "shared with me" don't trigger a PROPFIND at all,
        // so only wait for (and assert) it when explicitly requested
        await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.status() === 207 &&
              resp.request().method() === 'PROPFIND' &&
              resp.url().includes(encodeWebDavPath(name))
          ),
          page.locator(util.format(resourceNameSelector, name)).click()
        ])
      } else {
        await page.locator(util.format(resourceNameSelector, name)).click()
      }
      const extension = name.split('.').pop()
      switch (extension) {
        case 'mp3':
        case 'ogg':
          expect(await page.locator(previewAudio).getAttribute('src')).toContain(name)
          break
        case 'webm':
        case 'mp4':
          expect(await page.locator(previewVideo).getAttribute('src')).toContain(name)
          break
        default:
          // in case of error <img> doesn't contain src="blob:https://url"
          expect(await page.locator(previewImage).getAttribute('src')).toContain('blob:https://')
      }
      break
    }
    case 'pdfviewer': {
      await Promise.all([
        page.waitForResponse(
          (resp) => resp.status() === 207 && resp.request().method() === 'PROPFIND'
        ),
        page.locator(util.format(resourceNameSelector, name)).click()
      ])
      await page.locator(pdfViewerContainer).waitFor()
      break
    }
    case 'texteditor': {
      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.status() === 207 &&
            resp.request().method() === 'PROPFIND' &&
            (!verifyPropfindPath || resp.url().includes(encodeWebDavPath(name)))
        ),
        page.locator(util.format(resourceNameSelector, name)).click()
      ])
      await page.locator(textEditorContainer).waitFor()
      break
    }
  }
}

export const checkMediaViewerCount = async ({
  page,
  currentIndex,
  totalCount
}: {
  page: Page
  currentIndex: number
  totalCount: number
}): Promise<void> => {
  const elementCount = await page.locator(previewControlsCount).textContent()
  expect(elementCount).toEqual(`${currentIndex} of ${totalCount}`)
}

export const previewMediaFromSidebarPanel = async ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Promise<void> => {
  await sidebar.open({ page, resource })
  await sidebar.openPanel({ page, name: 'actions' })
  await page.locator(util.format(sideBarActionButton, 'Preview')).first().click()
}

export interface expectFileToBeLockedArgs {
  page: Page
  resource: string
}

export const getLockLocator = (args: expectFileToBeLockedArgs): Locator => {
  const { page, resource } = args
  return page.locator(util.format(resourceLockIcon, resource))
}

export const canEditContent = async ({
  page,
  type
}: {
  page: Page
  type: string
}): Promise<boolean> => {
  const editorMainFrame = page.frameLocator(externalEditorIframe)
  switch (type) {
    case 'OpenDocument':
      const collaboraDocPermissionModeLocator = editorMainFrame.locator(
        collaboraDocPermissionModeSelector
      )
      const collaboraDocPermissionModeText = (
        await collaboraDocPermissionModeLocator.innerText()
      ).trim()
      return collaboraDocPermissionModeText === 'Edit'
    case 'Microsoft Word':
      // By Default when "Microsoft Word document" is created, it is opened with "Euro-Office" if both app-provider services are running together
      const innerFrame = editorMainFrame.frameLocator(euroOfficeInnerFrameSelector)
      try {
        await expect(innerFrame.locator(euroOfficeSaveButtonSelector)).toBeVisible()
        return true
      } catch {
        return false
      }
  }
}

export const getFileThumbnailLocator = (args: { page: Page; resource: string }): Locator => {
  const { page, resource } = args
  return page.locator(util.format(fileThumbnail, resource))
}

export const getMotionPhotoBadgeLocator = (args: { page: Page; resource: string }): Locator => {
  const { page, resource } = args
  return page.locator(util.format(resourceMotionPhotoBadge, resource))
}

export const getPreviewMotionPhotoBadgeLocator = (args: {
  page: Page
  resource: string
}): Locator => {
  const { page, resource } = args
  return page.locator(util.format(previewMotionPhotoBadge, resource))
}
const motionPhotoViewerControl = '[data-testid="motion-photo-toggle"]'
// the play/pause control in the media viewer's controls bar
export const getMotionPhotoViewerControlLocator = (args: { page: Page }): Locator => {
  return args.page.locator(motionPhotoViewerControl)
}
const sidebarMotionPhotoBadge = '#oc-file-details-sidebar [data-testid="motion-photo-badge"]'
const sidebarMotionPhotoVideo = '#oc-file-details-sidebar [data-testid="preview"] video'

export const playMotionPhotoInSidebar = async (args: { page: Page }): Promise<void> => {
  const { page } = args
  await page.locator(sidebarMotionPhotoBadge).click()
}

export const getSidebarMotionPhotoVideoSource = async (args: { page: Page }): Promise<string> => {
  const { page } = args
  const locator = page.locator(sidebarMotionPhotoVideo)
  if ((await locator.count()) === 0) {
    return ''
  }
  return locator.evaluate((el: HTMLVideoElement) => el.currentSrc || el.src || '')
}

export const shouldSeeFilePreview = async ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Promise<void> => {
  await sidebar.open({ page: page, resource })
  await expect(page.locator(fileIconPreview)).toBeVisible()
  await sidebar.close({ page: page })
}

export const shouldNotSeeFilePreview = async ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Promise<void> => {
  await sidebar.open({ page: page, resource })
  await expect(page.locator(fileIcon)).toBeVisible()
  await sidebar.close({ page: page })
}

export const openFileViaContextMenu = async ({
  page,
  resource,
  fileViewer
}: {
  page: Page
  resource: string
  fileViewer: string
}): Promise<void> => {
  await page.locator(util.format(resourceNameSelector, resource)).click({ button: 'right' })
  await page.locator(openWithButton).hover()
  const editorItem = page.locator(util.format(openWithAction, fileViewer))
  await expect(editorItem).toBeVisible()
  await editorItem.click()
}

export const saveAs = async ({ page, newPath }: { page: Page; newPath: string }): Promise<Page> => {
  await page.locator(appBarContextMenu).click()
  await page.locator(appBarSaveAsButton).click()

  const frame = page.frameLocator(opencloudFrame)
  const parentPath = path.dirname(newPath)
  let filename = path.basename(newPath)
  if (parentPath !== '.') {
    await navigateFolderInEmbedMode({ page, parentPath: parentPath })
  }

  const newFilenameInput = frame.locator('#app-runtime-footer input.oc-text-input')
  await newFilenameInput.clear()
  await newFilenameInput.fill(filename)

  const currentFilename = await getTopBarFilename(page)
  if (currentFilename === newPath) {
    const filenameExt = path.extname(newPath)
    const newFilename = path.basename(newPath, filenameExt)
    // new file will be: <filename> (1).<ext>
    filename = `${newFilename} (1)${filenameExt}`
  }

  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(encodeURIComponent(filename)) &&
        resp.status() === 201 &&
        resp.request().method() === 'PUT'
    ),
    frame.getByTestId('button-select').click()
  ])

  return newPage
}

export const getTopBarFilename = (page: Page): Promise<string> => {
  return page.locator(topbarFilenameSelector).getAttribute('data-test-resource-name')
}
