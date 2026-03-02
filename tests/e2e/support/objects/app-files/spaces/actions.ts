import { Page, expect } from '@playwright/test'
import util from 'util'

import { sidebar, editor } from '../utils'
import Collaborator, { ICollaborator } from '../share/collaborator'
import { createLink } from '../link/actions'
import { File } from '../../../types'

const newSpaceMenuButton = '.oc-app-floating-action-button'
const spaceContextMenuButton = '#space-context-btn'
const spaceNameInputField = '.oc-modal input'
const actionConfirmButton = '.oc-modal-body-actions-confirm'
const spaceIdSelector = `[data-item-id="%s"] .oc-resource-basename`
const spacesRenameOptionSelector = '.oc-files-actions-rename-trigger:visible'
const editSpacesSubtitleOptionSelector = '.oc-files-actions-edit-description-trigger:visible'
const editQuotaOptionSelector = '.oc-files-actions-edit-quota-trigger:visible'
const editImageOptionSelector = '.oc-files-actions-upload-space-image-trigger'
const deleteImageButton = '.oc-files-actions-delete-space-image-trigger'
const setIconButton = '.oc-files-actions-set-space-icon-trigger'
const downloadSpaceSelector = '.oc-files-actions-download-archive-trigger:visible'
const spacesQuotaSearchField = '.oc-modal .vs__search'
const selectedQuotaValueField = '.vs--open'
const quotaValueDropDown = `.vs__dropdown-option :text-is("%s")`
const editSpacesDescription = '.oc-files-actions-edit-readme-content-trigger:visible'
const spacesDescriptionInputArea = '.cm-content'
const spacesDescriptionSaveTextFileInEditorButton = '#app-save-action:visible'
const spaceHeaderSelector = '.space-header'
const activitySidebarPanel = 'sidebar-panel-activities'
const activitySidebarPanelBodyContent = '#sidebar-panel-activities .sidebar-panel__body-content'
const editImageInContextMenuButton =
  '//button[contains(@id, "oc-files-context-actions-space-image")]'

export const openActionsPanel = async (page: Page): Promise<void> => {
  await sidebar.open({ page })
  await sidebar.openPanel({ page, name: 'space-actions' })
}

export const openSharingPanel = async (page: Page): Promise<void> => {
  await sidebar.open({ page })
  await sidebar.openPanel({ page, name: 'space-share' })
}

export const openActivitiesPanel = async (page: Page): Promise<void> => {
  await sidebar.open({ page })
  await sidebar.openPanel({ page, name: 'activities' })
}

/**/

export interface createSpaceArgs {
  name: string
  page: Page
}

export const createSpace = async (args: createSpaceArgs): Promise<string> => {
  const { page, name } = args

  await page.locator(newSpaceMenuButton).click()
  await page.locator(spaceNameInputField).fill(name)

  const postResponsePromise = page.waitForResponse(
    (postResp) =>
      postResp.status() === 201 &&
      postResp.request().method() === 'POST' &&
      postResp.url().endsWith('drives?template=default')
  )

  const [responses] = await Promise.all([
    postResponsePromise,
    page.locator(actionConfirmButton).click()
  ])

  const { id } = await responses.json()
  return id
}

/**/

export interface openSpaceArgs {
  id: string
  page: Page
}

export const openSpace = async (args: openSpaceArgs): Promise<void> => {
  const { page, id } = args
  await page.locator(util.format(spaceIdSelector, id)).click()
  await page.locator(spaceHeaderSelector).waitFor()
}
/**/

export const changeSpaceName = async (args: {
  page: Page
  id: string
  value: string
  contextMenu?: boolean
}): Promise<void> => {
  const { page, value, id, contextMenu = false } = args
  await (contextMenu ? page.locator(spaceContextMenuButton).click() : openActionsPanel(page))

  await page.locator(spacesRenameOptionSelector).click()
  await page.locator(spaceNameInputField).fill(value)
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(encodeURIComponent(id)) &&
        resp.status() === 200 &&
        resp.request().method() === 'PATCH'
    ),
    page.locator(actionConfirmButton).click()
  ])

  !contextMenu && (await sidebar.close({ page }))
}

/**/

export const changeSpaceSubtitle = async (args: {
  page: Page
  id: string
  value: string
  contextMenu?: boolean
}): Promise<void> => {
  const { page, value, id, contextMenu = false } = args
  await (contextMenu ? page.locator(spaceContextMenuButton).click() : openActionsPanel(page))

  await page.locator(editSpacesSubtitleOptionSelector).click()
  await page.locator(spaceNameInputField).fill(value)
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(encodeURIComponent(id)) &&
        resp.status() === 200 &&
        resp.request().method() === 'PATCH'
    ),
    page.locator(actionConfirmButton).click()
  ])

  !contextMenu && (await sidebar.close({ page }))
}

/**/

export const changeSpaceDescription = async (args: {
  page: Page
  value: string
  contextMenu?: boolean
}): Promise<void> => {
  const { page, value, contextMenu = false } = args
  await (contextMenu ? page.locator(spaceContextMenuButton).click() : openActionsPanel(page))

  const waitForUpdate = () =>
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith('readme.md') &&
        resp.status() === 200 &&
        resp.request().method() === 'GET'
    )
  await Promise.all([waitForUpdate(), page.locator(editSpacesDescription).click()])

  await page.locator(spacesDescriptionInputArea).fill(value)
  await Promise.all([
    page.waitForResponse((resp) => resp.status() === 204 && resp.request().method() === 'PUT'),
    page.waitForResponse((resp) => resp.status() === 207 && resp.request().method() === 'PROPFIND'),
    page.locator(spacesDescriptionSaveTextFileInEditorButton).click()
  ])
  await editor.close(page)
}

/**/

export const changeQuota = async (args: {
  id: string
  page: Page
  value: string
  contextMenu?: boolean
}): Promise<void> => {
  const { id, page, value, contextMenu = false } = args
  await (contextMenu ? page.locator(spaceContextMenuButton).click() : openActionsPanel(page))

  await page.locator(editQuotaOptionSelector).click()
  const searchLocator = page.locator(spacesQuotaSearchField)
  await searchLocator.pressSequentially(value)
  await page.locator(selectedQuotaValueField).waitFor()
  await page.locator(util.format(quotaValueDropDown, `${value} GB`)).click()

  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(encodeURIComponent(id)) &&
        resp.status() === 200 &&
        resp.request().method() === 'PATCH'
    ),
    page.locator(actionConfirmButton).click()
  ])

  !contextMenu && (await sidebar.close({ page }))
}

export interface SpaceMembersArgs {
  page: Page
  users: ICollaborator[]
}

export const addSpaceMembers = async (args: SpaceMembersArgs): Promise<void> => {
  const { page, users } = args
  await openSharingPanel(page)

  await Collaborator.inviteCollaborators({ page, collaborators: users })
  await sidebar.close({ page: page })
}

export const changeSpaceImage = async (args: {
  id: string
  page: Page
  resource: File
  contextMenu?: boolean
}): Promise<void> => {
  const { id, page, resource, contextMenu = false } = args
  if (contextMenu) {
    await page.locator(spaceContextMenuButton).click()
    await page.locator(editImageInContextMenuButton).hover()
  } else {
    await openActionsPanel(page)
  }
  const uploadTrigger = page.locator(editImageOptionSelector)
  await expect(uploadTrigger).toBeVisible()

  const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), uploadTrigger.click()])
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(encodeURIComponent(id)) &&
        resp.status() === 200 &&
        resp.request().method() === 'PATCH'
    ),
    page.waitForResponse(
      (resp) =>
        resp.url().includes('image.png') &&
        resp.status() === 200 &&
        resp.request().method() === 'GET'
    ),
    page.locator(actionConfirmButton).click(),
    fileChooser.setFiles(resource.path)
  ])

  !contextMenu && (await sidebar.close({ page }))
}

export const changeSpaceIcon = async (args: {
  id: string
  page: Page
  icon: string
  contextMenu?: boolean
}): Promise<void> => {
  const { id, page, icon, contextMenu = false } = args
  if (contextMenu) {
    await page.locator(spaceContextMenuButton).click()
    await page.locator(editImageInContextMenuButton).hover()
  } else {
    await openActionsPanel(page)
  }
  const setIcon = page.locator(setIconButton)
  await expect(setIcon).toBeVisible()
  await setIcon.click()

  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(encodeURIComponent(id)) &&
        resp.status() === 200 &&
        resp.request().method() === 'PATCH'
    ),
    page.waitForResponse(
      (resp) =>
        resp.url().includes('image.png') &&
        resp.status() === 201 &&
        resp.request().method() === 'PUT'
    ),
    page.locator(`button[aria-label="${icon}"]`).first().click()
  ])
  !contextMenu && (await sidebar.close({ page }))
}

export const deleteSpaceImage = async (args: {
  id: string
  page: Page
  contextMenu?: boolean
}): Promise<void> => {
  const { id, page, contextMenu = false } = args
  if (contextMenu) {
    await page.locator(spaceContextMenuButton).click()
    await page.locator(editImageInContextMenuButton).hover()
  } else {
    await openActionsPanel(page)
  }
  const deleteTrigger = page.locator(deleteImageButton)
  await expect(deleteTrigger).toBeVisible()

  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().includes('image.png') &&
        resp.status() === 204 &&
        resp.request().method() === 'DELETE'
    ),
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(encodeURIComponent(id)) &&
        resp.status() === 200 &&
        resp.request().method() === 'PATCH'
    ),
    page.locator(actionConfirmButton).click(),
    deleteTrigger.click()
  ])
  !contextMenu && (await sidebar.close({ page }))
}

export interface removeAccessMembersArgs extends Omit<SpaceMembersArgs, 'users'> {
  users: Omit<ICollaborator, 'role'>[]
  removeOwnSpaceAccess?: boolean
}

export const removeAccessSpaceMembers = async (args: removeAccessMembersArgs): Promise<void> => {
  const { page, users, removeOwnSpaceAccess } = args
  await openSharingPanel(page)

  for (const collaborator of users) {
    await Collaborator.removeCollaborator({ page, collaborator, removeOwnSpaceAccess })
  }
}

export const changeSpaceRole = async (args: SpaceMembersArgs): Promise<void> => {
  const { page, users } = args
  await openSharingPanel(page)

  for (const collaborator of users) {
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('permissions') &&
          resp.status() === 200 &&
          resp.request().method() === 'PATCH'
      ),
      Collaborator.changeCollaboratorRole({ page, collaborator })
    ])
  }
}

export const createPublicLinkForSpace = async (args: {
  page: Page
  password: string
}): Promise<string> => {
  const { page, password } = args
  await openSharingPanel(page)
  return createLink({ page: page, space: true, password: password })
}

export const addExpirationDateToMember = async (args: {
  page: Page
  member: Omit<ICollaborator, 'role'>
  expirationDate: string
}): Promise<void> => {
  const { page, member: collaborator, expirationDate } = args
  await openSharingPanel(page)
  await Collaborator.setExpirationDateForCollaborator({ page, collaborator, expirationDate })
}

export const removeExpirationDateFromMember = async (args: {
  page: Page
  member: Omit<ICollaborator, 'role'>
}): Promise<void> => {
  const { page, member: collaborator } = args
  await openSharingPanel(page)
  await Collaborator.removeExpirationDateFromCollaborator({ page, collaborator })
}

export const downloadSpace = async (page: Page): Promise<string> => {
  await openActionsPanel(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(downloadSpaceSelector).click()
  ])
  await sidebar.close({ page })

  return download.suggestedFilename()
}

export const checkSpaceActivity = async ({
  page,
  activity
}: {
  page: Page
  activity: string | RegExp
}): Promise<void> => {
  await openActivitiesPanel(page)
  await expect(page.getByTestId(activitySidebarPanel)).toBeVisible()
  await expect(page.locator(activitySidebarPanelBodyContent)).toContainText(activity)
}

export const getSpaceImageRatio = async (
  page: Page
): Promise<{ width: number; height: number }> => {
  const spaceImage = page.locator('.space-header .space-header-image .cursor-pointer')
  const width = await spaceImage.evaluate((img: HTMLImageElement) => img.naturalWidth)
  const height = await spaceImage.evaluate((img: HTMLImageElement) => img.naturalHeight)
  return { width, height }
}
