import { Page, Response, expect } from '@playwright/test'
import util from 'util'
import path from 'path'
import { sidebar } from '../utils'
import { utils } from '../../../../support'
import {
  actionConfirmationButton,
  actionSecondaryConfirmationButton,
  breadcrumbResourceNameSelector,
  checkBox,
  clickResource,
  clickResourceInEmbedMode,
  filesContextMenuAction,
  navigateFolderInEmbedMode,
  opencloudFrame,
  resourceNameSelector,
  selectAll,
  selectBatchAction,
  sideBarActionButton
} from './shared'

const breadcrumbRoot = '//nav[@id="files-breadcrumb"]//li[1]'
const highlightedTileCardSelector = '.oc-tile-card-selected'
const keepBothButton = '.oc-modal-body-actions-confirm'

export interface moveOrCopyResourceArgs {
  page: Page
  resource: string
  newLocation: string
  action: 'copy' | 'move'
  method: string
  option?: string
}

export interface moveOrCopyMultipleResourceArgs extends Omit<moveOrCopyResourceArgs, 'resource'> {
  resources: string[]
}

export const pasteResource = async (
  args: Omit<moveOrCopyResourceArgs, 'method'>
): Promise<void> => {
  const { page, resource, newLocation, action, option } = args
  const frame = page.frameLocator(opencloudFrame)

  await navigateFolderInEmbedMode({ page, parentPath: newLocation })
  const expectedMethod = option === 'copy instead' ? 'COPY' : action.toUpperCase()

  const respPromise = page.waitForResponse(
    (resp) =>
      resp.url().includes(resource) &&
      [201, 204].includes(resp.status()) &&
      resp.request().method() === expectedMethod
  )

  await frame.getByTestId('button-select').click()

  if (option) {
    switch (option) {
      case 'replace': {
        await page.locator(actionSecondaryConfirmationButton).click()
        break
      }

      case 'keep both': {
        await page.locator(keepBothButton).click()
        break
      }

      case 'copy instead': {
        const modalMessage = page.locator('.oc-modal-body-message')
        await expect(modalMessage).toContainText(
          'Moving files from one space to another is not possible'
        )
        await page.locator(util.format(actionConfirmationButton, 'Copy here')).click()
        break
      }
    }
  }
  await respPromise
}

const perFormEmbedModeAction = async ({
  page,
  newLocation,
  waitConditions,
  navigate = true,
  copyInstead = false
}: {
  page: Page
  newLocation: string
  waitConditions: Promise<any>[]
  navigate?: boolean
  copyInstead?: boolean
}): Promise<void> => {
  const frame = page.frameLocator(opencloudFrame)

  if (navigate) {
    await navigateFolderInEmbedMode({ page, parentPath: newLocation })
  }

  let submitAction = frame.getByTestId('button-select')
  if (copyInstead) {
    await submitAction.click()
    submitAction = page.locator(util.format(actionConfirmationButton, 'Copy here'))
  }

  await Promise.all([...waitConditions, submitAction.click()])
}

export const moveOrCopyMultipleResources = async (
  args: moveOrCopyMultipleResourceArgs
): Promise<void> => {
  const { page, newLocation, action, method, resources } = args

  for (const resource of resources) {
    await page.locator(util.format(checkBox, resource)).click()
  }

  const waitResponses = []
  if (['drag-drop-breadcrumb', 'drag-drop'].includes(method)) {
    for (const resource of resources) {
      waitResponses.push(
        page.waitForResponse(
          (resp) =>
            resp.url().endsWith(resource) &&
            resp.status() === 201 &&
            resp.request().method() === 'MOVE'
        )
      )
    }
  }

  switch (method) {
    case 'dropdown-menu': {
      // after selecting multiple resources, resources can be copied or moved by clicking on any of the selected resources
      await page.locator(highlightedTileCardSelector).first().click({ button: 'right' })
      await page.locator(util.format(filesContextMenuAction, action)).click()
      // NOTE: check response after opening embed mode.
      // waitForResponse won't work if it is checked before the embed mode is opened.
      const waitResponses = resources.map((resource) =>
        page.waitForResponse(
          (resp) =>
            resp.url().includes(resource) &&
            [201, 204].includes(resp.status()) &&
            resp.request().method() === action.toUpperCase()
        )
      )
      await perFormEmbedModeAction({ page, newLocation, waitConditions: waitResponses })
      break
    }
    case 'batch-action': {
      await selectBatchAction(page, action)
      // NOTE: check response after opening embed mode.
      // waitForResponse won't work if it is checked before the embed mode is opened.
      const waitResponses = resources.map((resource) =>
        page.waitForResponse(
          (resp) =>
            resp.url().includes(resource) &&
            [201, 204].includes(resp.status()) &&
            resp.request().method() === action.toUpperCase()
        )
      )
      await perFormEmbedModeAction({ page, newLocation, waitConditions: waitResponses })
      break
    }
    case 'keyboard': {
      const keyValue = action === 'copy' ? 'c' : 'x'
      await page.keyboard.press(`ControlOrMeta+${keyValue}`)
      await page.locator(breadcrumbRoot).click()
      const newLocationPath = newLocation.split('/')
      for (const path of newLocationPath) {
        if (path !== 'Personal') {
          await clickResource({ page, path: path })
        }
      }
      await page.keyboard.press('ControlOrMeta+v')
      break
    }
    case 'drag-drop': {
      const source = page.locator(highlightedTileCardSelector).first()
      const target = page.locator(util.format(resourceNameSelector, newLocation))

      await Promise.all([...waitResponses, source.dragTo(target)])

      await target.click()
      break
    }
    case 'drag-drop-breadcrumb': {
      const source = page.locator(highlightedTileCardSelector).first()
      const target = page.locator(
        util.format(
          breadcrumbResourceNameSelector,
          utils.locatorUtils.buildXpathLiteral(newLocation)
        )
      )

      await Promise.all([...waitResponses, source.dragTo(target)])

      await target.click()
      break
    }
  }
}

export const copyMoveResourcesWithCreateDestination = async ({
  page,
  action,
  resources,
  newLocation,
  copyInstead
}: {
  page: Page
  action: 'copy' | 'move'
  resources: string[]
  newLocation: string
  copyInstead: boolean
}): Promise<void> => {
  // get the parent
  const { dir: resourceDir } = path.parse(resources[0])
  const resourceList: string[] = []

  for (const resource of resources) {
    const { dir: parentDir, base: resourceName } = path.parse(resource)
    if (parentDir !== resourceDir) {
      throw new Error(
        'All resources must be within the same parent.' +
          ` Expected: ${resourceDir}, but got: ${parentDir}`
      )
    }
    resourceList.push(resourceName)
  }

  // open the parent directory
  if (resourceDir) {
    await clickResource({ page, path: resourceDir })
  }

  // select the resources
  for (const resourceName of resourceList) {
    await page.locator(util.format(checkBox, resourceName)).click()
  }
  await selectBatchAction(page, action)

  const destinationPath = newLocation.split('/')
  const sidebarItem = destinationPath.shift()
  await navigateFolderInEmbedMode({ page, parentPath: sidebarItem, sidebarOnly: true })
  await clickResourceInEmbedMode({
    page,
    path: destinationPath.join('/'),
    createIfNotExist: true
  })

  let actionMethod = action.toUpperCase()
  if (copyInstead) {
    actionMethod = 'COPY'
  }
  // NOTE: check response after opening embed mode.
  // waitForResponse won't work if it is checked before the embed mode is opened.
  const waitConditions: Promise<Response>[] = []
  for (const resourceName of resourceList) {
    waitConditions.push(
      page.waitForResponse(
        (resp) =>
          resp.url().includes(resourceName) &&
          [201, 204].includes(resp.status()) &&
          resp.request().method() === actionMethod
      )
    )
  }
  await perFormEmbedModeAction({ page, newLocation, waitConditions, navigate: false, copyInstead })
}

export const moveOrCopyResource = async (args: moveOrCopyResourceArgs): Promise<void> => {
  const { page, resource, newLocation, action, method, option } = args
  const { dir: resourceDir, base: resourceBase } = path.parse(resource)

  if (resourceDir) {
    await clickResource({ page, path: resourceDir })
  }

  switch (method) {
    case 'dropdown-menu': {
      await page.locator(util.format(resourceNameSelector, resourceBase)).click({ button: 'right' })
      await page.locator(util.format(filesContextMenuAction, action)).click()
      await pasteResource({ page, resource: resourceBase, newLocation, action, option })
      break
    }
    case 'batch-action': {
      await page.locator(util.format(checkBox, resourceBase)).click()
      await selectBatchAction(page, action)
      await pasteResource({ page, resource: resourceBase, newLocation, action, option })
      break
    }
    case 'sidebar-panel': {
      await sidebar.open({ page: page, resource: resourceBase })
      await sidebar.openPanel({ page: page, name: 'actions' })

      const actionButtonType = action === 'copy' ? 'Copy to' : 'Move to'
      await page.locator(util.format(sideBarActionButton, actionButtonType)).click()
      await pasteResource({ page, resource: resourceBase, newLocation, action, option })
      break
    }
    case 'keyboard': {
      const resourceCheckbox = page.locator(util.format(checkBox, resourceBase))
      const isChecked = await resourceCheckbox.isChecked()
      if (!isChecked) {
        await resourceCheckbox.click()
      }
      const keyValue = action === 'copy' ? 'c' : 'x'
      await page.keyboard.press(`ControlOrMeta+${keyValue}`)
      await page.locator(breadcrumbRoot).click()
      const newLocationPath = newLocation.split('/')
      for (const path of newLocationPath) {
        if (path !== 'Personal') {
          await clickResource({ page, path: path })
        }
      }
      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().endsWith(resource) &&
            resp.status() === 201 &&
            resp.request().method() === action.toUpperCase()
        ),
        page.keyboard.press('ControlOrMeta+v')
      ])
      break
    }
    case 'drag-drop': {
      const source = page.locator(util.format(resourceNameSelector, resourceBase))
      const target = page.locator(util.format(resourceNameSelector, newLocation))

      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().endsWith(resource) &&
            resp.status() === 201 &&
            resp.request().method() === 'MOVE'
        ),
        source.dragTo(target)
      ])

      await Promise.all([
        page.locator(util.format(resourceNameSelector, resourceBase)),
        page.locator(util.format(resourceNameSelector, newLocation)).click()
      ])

      break
    }
    case 'drag-drop-breadcrumb': {
      const source = page.locator(util.format(resourceNameSelector, resourceBase))
      const target = page.locator(
        util.format(
          breadcrumbResourceNameSelector,
          utils.locatorUtils.buildXpathLiteral(newLocation)
        )
      )

      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().endsWith(resource) &&
            resp.status() === 201 &&
            resp.request().method() === 'MOVE'
        ),
        source.dragTo(target)
      ])

      await Promise.all([
        page.locator(util.format(resourceNameSelector, resourceBase)),
        page
          .locator(
            util.format(
              breadcrumbResourceNameSelector,
              utils.locatorUtils.buildXpathLiteral(newLocation)
            )
          )
          .click()
      ])

      break
    }
  }
}

export const copyAllTo = async ({
  page,
  source,
  destination
}: {
  page: Page
  source: string
  destination: string
}): Promise<void> => {
  await page.locator(util.format(resourceNameSelector, source)).click()
  await selectAll({ page })
  await selectBatchAction(page, 'copy')

  await pasteResource({
    page,
    resource: source,
    newLocation: destination,
    action: 'copy'
  })
}
