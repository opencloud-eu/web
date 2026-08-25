import { expect, Locator, Page } from '@playwright/test'

const closeTextEditorOrViewerButton = '#app-top-bar-close'
const saveTextEditorOrViewerButton = '#app-save-action'
const texEditor = '.text-editor-provider'
const pdfViewer = '#pdf-viewer'
const imageViewer = '.stage'
const textEditorContent = '.tiptap.ProseMirror'
const collaborationCursorLabel = '.collaboration-cursor__label'
const saveConflictDialog = '.oc-modal'
const filesListUrl = /.*\/files\/(spaces|shares|link|search)\/.*/
const errorNotification = '.oc-notification-message-danger'
const saveConflictDialogButtons: Record<string, string> = {
  Save: '.oc-modal-body-actions-confirm',
  "Don't Save": '.oc-modal-body-actions-secondary',
  Cancel: '.oc-modal-body-actions-cancel'
}

export const close = async (page: Page) => {
  const navigationPromise = page.waitForURL(filesListUrl)
  await page.locator(closeTextEditorOrViewerButton).click()
  // unsaved changes block the navigation until the save conflict dialog is resolved
  await Promise.race([navigationPromise, page.locator(saveConflictDialog).waitFor()])
}

export const save = async (page: Page): Promise<unknown> => {
  return await Promise.all([
    page.waitForResponse((res) => res.request().method() === 'PUT' && res.status() === 204),
    page.locator(saveTextEditorOrViewerButton).click()
  ])
}

export const saveExpectingConflict = async (page: Page): Promise<unknown> => {
  return await Promise.all([
    page.waitForResponse((res) => res.request().method() === 'PUT' && res.status() === 412),
    page.locator(saveTextEditorOrViewerButton).click()
  ])
}

export const fileViewerLocator = ({
  page,
  fileViewerType
}: {
  page: Page
  fileViewerType: string
}): Locator => {
  switch (fileViewerType) {
    case 'text-editor':
      return page.locator(texEditor)
    case 'pdf-viewer':
      return page.locator(pdfViewer)
    case 'media-viewer':
      return page.locator(imageViewer)
    default:
      throw new Error(`${fileViewerType} not implemented`)
  }
}

export const saveButtonLocator = (page: Page): Locator => page.locator(saveTextEditorOrViewerButton)

export const textEditorContentLocator = (page: Page): Locator => page.locator(textEditorContent)

export const errorNotificationLocator = (page: Page): Locator => page.locator(errorNotification)

export const collaborationCaretLocator = (page: Page, displayName: string): Locator =>
  page.locator(collaborationCursorLabel, { hasText: displayName })

export const resolveSaveConflict = async (page: Page, action: string): Promise<void> => {
  const button = saveConflictDialogButtons[action]
  if (!button) {
    throw new Error(`save conflict dialog action "${action}" not implemented`)
  }

  const dialog = page.locator(saveConflictDialog)
  await expect(dialog).toBeVisible()

  if (action === 'Cancel') {
    await dialog.locator(button).click()
    await expect(dialog).not.toBeVisible()
    return
  }

  const navigationPromise = page.waitForURL(filesListUrl)
  await dialog.locator(button).click()
  await navigationPromise
  await page.locator('#app-loading-spinner').waitFor({ state: 'detached' })
}
