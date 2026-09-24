import { When, Then } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { expect } from '@playwright/test'
import { appConfig } from '../../playwright.config'
import { waitProcessingToFinish } from '../../support/objects/app-files/fileEvents'
import { editor } from '../../support/objects/app-files/utils'
import { pageObjectFor, actorPage } from '../../environment/pageObject'

// how long a late duplicate of the hydrated content may need to arrive
const duplicateContentGraceMs = 3000

const allowedFileViewers = ['collabora-online', 'text-editor', 'preview'] as const
type AllowedFileViewer = (typeof allowedFileViewers)[number]

function toFileViewer(fileViewer: string): AllowedFileViewer {
  if (!allowedFileViewers.includes(fileViewer as AllowedFileViewer)) {
    throw new Error(`Unsupported file viewer: ${fileViewer}`)
  }
  return fileViewer as AllowedFileViewer
}

When(
  /^"([^"].*)" opens the following file(?:s)? in (mediaviewer|pdfviewer|texteditor|Collabora|Euro-Office)$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    stepTable: DataTable
  ) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    for (const info of stepTable.hashes()) {
      await resourceObject.openFileInViewer({
        name: info.resource,
        actionType: actionType as
          'mediaviewer' | 'pdfviewer' | 'texteditor' | 'Collabora' | 'Euro-Office',
        verifyPropfindPath: info.verifyPropfindPath === 'true'
      })
    }
  }
)

Then(
  '{string} should see resource {string} of {string} in the mediaviewer controls',
  async (
    { world }: { world: World },
    stepUser: string,
    currentIndex: string,
    totalCount: string
  ) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.checkMediaViewerCount({
      currentIndex: parseInt(currentIndex),
      totalCount: parseInt(totalCount)
    })
  }
)

Then(
  /^for "([^"]*)" file "([^"]*)" (should|should not) be locked$/,
  async ({ world }: { world: World }, stepUser: string, file: string, actionType: string) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const lockLocator = resourceObject.getLockLocator({ resource: file })

    actionType === 'should'
      ? await expect(lockLocator).toBeVisible()
      : // can take more than 5 seconds for lock to be released in case of Euro-Office
        await expect(lockLocator).not.toBeVisible({ timeout: appConfig.timeout * 1000 })
  }
)

When(
  /^"([^"]*)" navigates to the (next|previous) media resource$/,
  async ({ world }: { world: World }, stepUser: string, navigationType: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.navigateMediaFile(navigationType)
  }
)

When(
  '{string} opens a file {string} in the media-viewer using the sidebar panel',
  async ({ world }: { world: World }, stepUser: any, file: any): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.previewMediaFromSidebarPanel(file)
  }
)

Then(
  /^"([^"]*)" (should|should not) see (thumbnail and preview|preview) for file "([^"]*)"$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    action: string,
    resource: string
  ): Promise<void> => {
    const page = actorPage(world, stepUser)
    const resourceObject = new objects.applicationFiles.Resource({ page })
    if (actionType === 'should') {
      await resourceObject.getResourceLocator(resource).waitFor()
      await waitProcessingToFinish(page, resource)
      action === 'thumbnail and preview' &&
        (await expect(resourceObject.getFileThumbnailLocator(resource)).toBeVisible())
      await resourceObject.shouldSeeFilePreview({ resource })
    } else {
      action === 'thumbnail and preview' &&
        (await expect(resourceObject.getFileThumbnailLocator(resource)).not.toBeVisible())
      await resourceObject.shouldNotSeeFilePreview({ resource })
    }
  }
)

When(
  '{string} opens file {string} via {string} using the context menu',
  async (
    { world }: { world: World },
    stepUser: string,
    file: string,
    fileViewer: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    await resourceObject.openFileViaContextMenu(file, toFileViewer(fileViewer))
  }
)

When(
  'the following users open file {string} via {string} using the context menu at the same time',
  async (
    { world }: { world: World },
    file: string,
    fileViewer: string,
    stepTable: DataTable
  ): Promise<void> => {
    const viewer = toFileViewer(fileViewer)

    await Promise.all(
      stepTable.hashes().map(({ id }) => {
        const resourceObject = pageObjectFor(world, id, objects.applicationFiles.Resource)
        return resourceObject.openFileViaContextMenu(file, viewer)
      })
    )
  }
)

Then(
  '{string} should see the text {string} in the text-editor',
  async ({ world }: { world: World }, stepUser: string, text: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    await expect(page.locator('.tiptap.ProseMirror')).toContainText(text)
  }
)

Then(
  '{string} should see the text {string} exactly once in the text-editor',
  async ({ world }: { world: World }, stepUser: string, text: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    const content = editor.textEditorContentLocator(page)
    await expect(content).toContainText(text)

    // a duplicate seed lands shortly after hydration, so the count has to stay at one
    const deadline = Date.now() + duplicateContentGraceMs
    for (;;) {
      expect(await editor.countTextOccurrences(content, text)).toBe(1)
      if (Date.now() >= deadline) break
      await page.waitForTimeout(250)
    }
  }
)

Then(
  '{string} should see an error message',
  async ({ world }: { world: World }, stepUser: string, errorMessage: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    await expect(editor.errorNotificationLocator(page, errorMessage)).toBeVisible()
  }
)

Then(
  '{string} should see a notification',
  async ({ world }: { world: World }, stepUser: string, message: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    await expect(editor.notificationLocator(page, message)).toBeVisible()
  }
)

Then(
  '{string} should see the following yjs status',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const page = actorPage(world, stepUser)

    for (const { status } of stepTable.hashes()) {
      await expect(editor.yjsStatusLocator(page, status.toLowerCase())).toBeVisible()
    }
  }
)

Then(
  '{string} should not see a yjs status',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const page = actorPage(world, stepUser)

    // the editor must be loaded, otherwise the assertion passes trivially
    await expect(editor.textEditorContentLocator(page)).toBeVisible()
    await expect(editor.yjsStatusIndicatorLocator(page)).not.toBeVisible()
  }
)

Then(
  '{string} should not be able to edit the current file',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    await expect(editor.textEditorContentLocator(page)).toHaveAttribute('contenteditable', 'false')
    await expect(editor.saveButtonLocator(page)).not.toBeVisible()
  }
)

Then(
  '{string} should see the collaboration carets of the following users',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const page = actorPage(world, stepUser)

    for (const { id } of stepTable.hashes()) {
      const { displayName } = world.usersEnvironment.getUser({ key: id })
      await expect(editor.collaborationCaretLocator(page, displayName)).toBeVisible()
    }
  }
)

Then(
  /^"([^"]*)" sees the current file as (dirty|clean)$/,
  async ({ world }: { world: World }, stepUser: string, state: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    const saveButton = editor.saveButtonLocator(page)

    if (state === 'dirty') {
      await expect(saveButton).toBeEnabled()
      return
    }
    await expect(saveButton).toBeDisabled()
  }
)

When(
  '{string} saves the current file as {string}',
  async ({ world }: { world: World }, stepUser: string, newPath: string): Promise<void> => {
    const actor = world.actorsEnvironment.getActor({ key: stepUser })
    const resourceObject = new objects.applicationFiles.Resource({ page: actor.page })

    const newPage = await resourceObject.saveAs(newPath)
    // change current active page
    actor.savePage(newPage)
  }
)

Then(
  'file {string} should be opened in texteditor for user {string}',
  async ({ world }: { world: World }, filename: string, stepUser: string): Promise<void> => {
    const actor = world.actorsEnvironment.getActor({ key: stepUser })
    const resourceObject = new objects.applicationFiles.Resource({ page: actor.page })
    const actualFilename = await resourceObject.getTopBarFilename()
    expect(actualFilename).toBe(filename)
  }
)

When(
  '{string} mentions user {string} in editor',
  async ({ world }: { world: World }, stepUser: string, mentionedUser: string): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const { displayName } = world.usersEnvironment.getUser({ key: mentionedUser })
    const actor = world.actorsEnvironment.getActor({ key: stepUser })
    const resourceObject = new objects.applicationFiles.Resource({ page: actor.page })
    await resourceObject.mentionUserInOpenDocument({ page, user: displayName })
  }
)

When(
  '{string} closes the file viewer',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    await editor.close(page)
  }
)

When(
  '{string} saves the file viewer',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    await editor.save(page)
  }
)

When(
  '{string} saves the file viewer expecting conflict error',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    await editor.saveExpectingConflict(page)
    await expect(editor.errorNotificationLocator(page)).toBeVisible()
  }
)

Then(
  /^"([^"]*)" is in a (text-editor|pdf-viewer|media-viewer)$/,
  async ({ world }: { world: World }, stepUser: string, fileViewerType: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    const fileViewerLocator = editor.fileViewerLocator({ page, fileViewerType })
    await expect(fileViewerLocator).toBeVisible()
  }
)

When(
  '{string} enters the text {string} in editor {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    text: string,
    editorToOpen: string
  ): Promise<void> => {
    const page = actorPage(world, stepUser)
    const pageObject = new objects.applicationFiles.page.Public({ page })
    await pageObject.fillContentOfOpenDocumentOrMicrosoftWordDocument({
      page,
      text,
      editorToOpen
    })
  }
)

When(
  '{string} should see the content {string} in editor {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    expectedContent: string,
    editorToOpen: string
  ): Promise<void> => {
    const page = actorPage(world, stepUser)
    const pageObject = new objects.applicationFiles.page.Public({ page })
    const actualFileContent = await pageObject.getContentOfOpenDocumentOrMicrosoftWordDocument({
      page,
      editorToOpen
    })
    expect(actualFileContent.trim()).toBe(expectedContent)
  }
)

When(
  '{string} sees the save conflict dialog and chooses the following action',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const page = actorPage(world, stepUser)
    const [{ action }] = stepTable.hashes()
    await editor.resolveSaveConflict(page, action)
  }
)
