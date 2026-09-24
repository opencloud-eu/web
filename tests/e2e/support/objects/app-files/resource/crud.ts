import { Page, expect } from '@playwright/test'
import util from 'util'
import path from 'path'
import { editor, sidebar } from '../utils'
import { state } from '../../../../environment/shared'
import {
  actionConfirmationButton,
  ActionViaType,
  addNewResourceButton,
  appBarContextMenu,
  clickResource,
  collaboraDocTextAreaSelector,
  createNewFolderButton,
  euroOfficeDocTextAreaSelector,
  euroOfficeInnerFrameSelector,
  euroOfficeSaveButtonSelector,
  externalEditorIframe,
  filesContextMenuAction,
  resourceArgs,
  resourceNameInput,
  resourceNameSelector,
  selectOrDeselectResources
} from './shared'
import { enterVault, vaultSetupPassphraseInput } from './vault'
import { editTextDocument, fillContentOfDocument, getLockLocator } from './viewer'

const deleteButtonBatchAction = '.oc-files-actions-delete-trigger'
const createNewNoteFileButton = '.new-file-btn-ocnote'
const createNewMdFileButton = '.new-file-btn-md'
const createNewOfficeDocumentFileBUtton = '//div[@id="create-or-upload-drop"]//span[text()="%s"]'
const fileRenameInput = '.oc-text-input'
const deleteButtonSidebar = '#oc-files-actions-sidebar .oc-files-actions-delete-trigger'
const undoBtn = 'action-handler'
const encryptFolderSwitch = '[data-testid="create-folder-encrypt"] [data-testid="oc-switch-btn"]'

export type createResourceTypes =
  'folder' | 'noteFile' | 'mdFile' | 'Document' | 'OpenDocument' | 'Microsoft Word' | 'vault'

export interface createResourceArgs {
  page: Page
  name: string
  type: createResourceTypes
  content?: string
  password?: string
}

export const createNewFolder = async ({
  page,
  resource
}: {
  page: Page
  resource: string
}): Promise<void> => {
  await page.locator(createNewFolderButton).click()
  await page.locator(resourceNameInput).fill(resource)
  const createBtn = page.locator(util.format(actionConfirmationButton, 'Create'))
  await expect(createBtn).toBeEnabled()

  const mkcolPromise = page.waitForResponse(
    (resp) => resp.status() === 201 && resp.request().method() === 'MKCOL'
  )
  await createBtn.click()
  await mkcolPromise
}

export const createNewFileOrFolder = async (args: createResourceArgs): Promise<void> => {
  const { page, name, type, content, password } = args
  await expect(page.locator(addNewResourceButton)).toBeVisible()
  await expect(page.locator(addNewResourceButton)).toBeEnabled()
  await page.locator(addNewResourceButton).click()
  switch (type) {
    case 'folder': {
      await createNewFolder({ page, resource: name })
      break
    }
    case 'noteFile': {
      await page.locator(createNewNoteFileButton).click()
      const resourceInput = page.locator(resourceNameInput)
      // Clear the field and fill in the name without the extension.
      await resourceInput.clear()
      await resourceInput.fill(name)
      await Promise.all([
        page.waitForResponse((resp) => resp.status() === 201 && resp.request().method() === 'PUT'),
        page.locator(util.format(actionConfirmationButton, 'Create')).click()
      ])
      await editTextDocument({ page, content, name, password })
      break
    }
    case 'mdFile': {
      await page.locator(createNewMdFileButton).click()
      const resourceInput = page.locator(resourceNameInput)
      await resourceInput.clear()
      await resourceInput.fill(name)
      await Promise.all([
        page.waitForResponse((resp) => resp.status() === 201 && resp.request().method() === 'PUT'),
        page.locator(util.format(actionConfirmationButton, 'Create')).click()
      ])
      await editTextDocument({ page, content, name })
      break
    }
    case 'OpenDocument': {
      // By Default when OpenDocument is created, it is opened with collabora if both app-provider services are running together
      await createDocumentFile(args, 'Collabora')
      break
    }
    case 'Microsoft Word': {
      // By Default when Microsoft Word document is created, it is opened with Euro-Office if both app-provider services are running together
      await createDocumentFile(args, 'Euro-Office')
      break
    }
    case 'vault': {
      // A vault is a folder created with the encryption switch turned on. The
      // vault naming is idempotent, so passing the full `x.vault` name the
      // features use works as well as passing `x`.
      await page.locator(createNewFolderButton).click()
      const resourceInput = page.locator(resourceNameInput)
      await resourceInput.clear()
      await resourceInput.fill(name)
      await page.locator(encryptFolderSwitch).click()

      // Encryption turns the modal into two steps: the scheme asks for the
      // passphrase before anything is created.
      await page.locator(util.format(actionConfirmationButton, 'Continue')).click()
      await page.locator(vaultSetupPassphraseInput).fill(password)

      const createBtn = page.locator(util.format(actionConfirmationButton, 'Create'))
      const mkcolPromise = page.waitForResponse(
        (resp) => resp.status() === 201 && resp.request().method() === 'MKCOL'
      )
      // Committing the passphrase writes the integrity token onto the new folder.
      const proppatchPromise = page.waitForResponse(
        (resp) => resp.request().method() === 'PROPPATCH'
      )

      await createBtn.click()
      await mkcolPromise
      await proppatchPromise

      // A freshly created vault stays locked and the user stays put, so step in
      // explicitly. The hidden `.empty` folder keeps the vault non-empty, which
      // the scenarios below rely on.
      await enterVault({ page, vault: name, passphrase: password })
      await page.locator(addNewResourceButton).click()
      await createNewFolder({ page, resource: '.empty' })
      break
    }
    default:
      throw new Error(`Unknown resource type: ${type}`)
  }
}

const createDocumentFile = async (
  args: createResourceArgs,
  editorToOpen: string
): Promise<void> => {
  const { page, name, content, type } = args
  // for creating office suites documents we need the external app provider services to be ready
  // though the service is ready it takes some time for the list of office suites documents to be visible in the dropdown in the webUI
  // which requires a retry to check if the service is ready and the office suites documents is visible in the dropdown
  let typeLocator = type
  switch (type) {
    case 'OpenDocument': {
      typeLocator = 'Document'
    }
  }

  const isAppProviderServiceReadyInWebUI = await isAppProviderServiceForOfficeSuitesReadyInWebUI(
    page,
    typeLocator
  )
  if (isAppProviderServiceReadyInWebUI === false) {
    throw new Error(
      `The document of type ${type} did not appear in the webUI for ${editorToOpen}. Possible reason could be the app provider service for ${editorToOpen} was not ready yet.`
    )
  }
  await page.locator(util.format(createNewOfficeDocumentFileBUtton, typeLocator)).click()
  const resourceInput = page.locator(resourceNameInput)
  await resourceInput.clear()
  await resourceInput.fill(name)
  const loadStatePromise = page.waitForLoadState()
  const urlPromise = page.waitForURL(/.*\/external-.*/)
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.status() === 200 &&
      resp.request().method() === 'POST' &&
      resp.request().url().includes('/app/open?')
  )
  await page.locator(util.format(actionConfirmationButton, 'Create')).click()
  await loadStatePromise
  await urlPromise
  await responsePromise

  const editorMainFrame = page.frameLocator(externalEditorIframe)
  switch (editorToOpen) {
    case 'Collabora':
      if (state.projectName === 'mobile-chromium' || state.projectName === 'mobile-webkit') {
        await editorMainFrame.locator('#mobile-edit-button').click()
      }
      await editorMainFrame.locator(collaboraDocTextAreaSelector).fill(content)
      break
    case 'Euro-Office':
      const innerIframe = editorMainFrame.frameLocator(euroOfficeInnerFrameSelector)
      await innerIframe.locator(euroOfficeDocTextAreaSelector).fill(content)
      const saveButtonDisabledLocator = innerIframe.locator(euroOfficeSaveButtonSelector)
      await expect(saveButtonDisabledLocator).toHaveAttribute('disabled', 'disabled')
      break
    default:
      throw new Error(
        "Editor should be either 'Collabora' or 'Euro-Office' but found " + editorToOpen
      )
  }
  await Promise.all([
    page.waitForResponse((res) => res.status() === 207 && res.request().method() === 'PROPFIND'),
    editor.close(page)
  ])

  await page.locator(util.format(resourceNameSelector, name)).waitFor()
  // wait for lock to be removed
  expect(getLockLocator({ page, resource: name })).not.toBeVisible()
}

const isAppProviderServiceForOfficeSuitesReadyInWebUI = async (page: Page, type: string) => {
  let retry = 1
  let isCreateNewOfficeDocumentFileButtonVisible
  while (retry <= 5) {
    await page.locator(createNewFolderButton).waitFor()
    isCreateNewOfficeDocumentFileButtonVisible = await page
      .locator(util.format(createNewOfficeDocumentFileBUtton, type))
      .isVisible()
    if (isCreateNewOfficeDocumentFileButtonVisible === true) {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await page.reload()
    await page.locator(addNewResourceButton).click()
    retry++
  }
  return isCreateNewOfficeDocumentFileButtonVisible
}

export const createResources = async (args: createResourceArgs): Promise<void> => {
  const { page, name, type, content, password } = args
  const paths = name.split('/')
  const resource = paths.pop()

  for (const path of paths) {
    await clickResource({ page, path, password })
  }
  await createNewFileOrFolder({ page, name: resource, type, content, password })
}

export interface renameResourceArgs {
  page: Page
  resource: string
  newName: string
}

export const renameResource = async (args: renameResourceArgs): Promise<void> => {
  const { page, resource, newName } = args
  const { dir: resourceDir, base: resourceBase } = path.parse(resource)

  if (resourceDir) {
    await clickResource({ page, path: resourceDir })
  }

  await page.locator(util.format(resourceNameSelector, resourceBase)).click({ button: 'right' })
  await page.locator(util.format(filesContextMenuAction, 'rename')).click()
  const resourceInput = page.locator(fileRenameInput)
  // Clear the field and fill in the name
  await resourceInput.clear()
  await resourceInput.fill(newName)
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().endsWith(resourceBase) &&
        resp.status() === 201 &&
        resp.request().method() === 'MOVE'
    ),
    page.locator(util.format(actionConfirmationButton, 'Rename')).click()
  ])
}

export interface editResourcesArgs {
  page: Page
  name: string
  type: string
  content: string
}

export const editResources = async (args: editResourcesArgs): Promise<void> => {
  const { page, name, type, content } = args
  const { dir: resourceDir } = path.parse(name)

  const folderPaths = name.split('/')
  const resourceName = folderPaths.pop()

  if (resourceDir) {
    await clickResource({ page, path: resourceDir })
  }

  switch (type) {
    case 'OpenDocument':
      await fillContentOfDocument({ page, text: content, editorToOpen: 'Collabora' })
      break
    case 'Microsoft Word':
      await fillContentOfDocument({ page, text: content, editorToOpen: 'Euro-Office' })
      break
    default:
      await page.locator(util.format(resourceNameSelector, resourceName)).click()
      await editTextDocument({ page, content: content, name: resourceName })
  }
}

export interface deleteResourceArgs {
  page: Page
  resourcesWithInfo: resourceArgs[]
  via: ActionViaType
  folder?: string
  isPublicLink?: boolean
}

export const deleteResource = async (args: deleteResourceArgs): Promise<void> => {
  const { page, resourcesWithInfo, folder, via, isPublicLink } = args
  switch (via) {
    case 'SIDEBAR_PANEL': {
      if (folder) {
        await clickResource({ page, path: folder })
      }
      for (const resource of resourcesWithInfo) {
        await sidebar.open({ page, resource: resource.name })
        await sidebar.openPanel({ page, name: 'actions' })
        await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.url().includes(encodeURIComponent(resource.name)) &&
              resp.status() === 204 &&
              resp.request().method() === 'DELETE'
          ),
          page.locator(deleteButtonSidebar).first().click()
        ])
        await sidebar.close({ page })
      }
      break
    }

    case 'BATCH_ACTION': {
      await selectOrDeselectResources({ page, resources: resourcesWithInfo, folder, select: true })

      const waitResponses = []
      for (const info of resourcesWithInfo) {
        waitResponses.push(
          page.waitForResponse(
            (resp) =>
              resp.status() === 204 &&
              resp.request().method() === 'DELETE' &&
              resp
                .request()
                .url()
                .endsWith(`/${encodeURIComponent(info.name)}`)
          )
        )
      }
      if (!isPublicLink) {
        // wait for GET response after all the resource are deleted with batch action
        waitResponses.push(
          page.waitForResponse(
            (resp) =>
              resp.url().includes('graph/v1.0/drives') &&
              resp.status() === 200 &&
              resp.request().method() === 'GET'
          )
        )
      }

      await Promise.all([...waitResponses, page.locator(deleteButtonBatchAction).click()])
      break
    }
  }
}

export const deleteAllResources = async ({ page }: { page: Page }): Promise<void> => {
  await Promise.all([
    page.waitForResponse((resp) => resp.status() === 204 && resp.request().method() === 'DELETE'),
    page.locator(deleteButtonBatchAction).click()
  ])
  await page.locator('#files-space-empty').waitFor()
}

export const deleteResourceViaAppTopbar = async ({ page }: { page: Page }): Promise<void> => {
  const appTopbarContextButton = page.locator(appBarContextMenu)
  await appTopbarContextButton.click()
  await Promise.all([
    page.waitForResponse((resp) => resp.status() === 204 && resp.request().method() === 'DELETE'),
    page.locator(deleteButtonBatchAction).click()
  ])
}

export const deleteAndUndo = async ({
  page,
  method,
  resourcesWithInfo,
  via,
  folder
}: {
  page: Page
  method: 'keyboard' | 'undo button'
  resourcesWithInfo: resourceArgs[]
  via: ActionViaType
  folder?: string
}): Promise<void> => {
  await deleteResource({
    page,
    resourcesWithInfo,
    via,
    folder
  })

  const undoButton = page.getByTestId(undoBtn)
  await expect(undoButton.first()).toBeVisible()

  const responsePromise = page.waitForResponse(
    (resp) => resp.request().method() === 'MOVE' && resp.status() === 201
  )
  if (method === 'keyboard') {
    await page.keyboard.press('ControlOrMeta+z')
  } else {
    await undoButton.first().click()
  }
  await responsePromise
}
