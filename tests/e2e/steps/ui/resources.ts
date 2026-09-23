import { When } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import path from 'path'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { expect } from '@playwright/test'
import {
  createResourceTypes,
  ActionViaType
} from '../../support/objects/app-files/resource/actions'
import { Public } from '../../support/objects/app-files/page/public'
import { Resource } from '../../support/objects/app-files'
import { pageObjectFor } from '../../environment/pageObject'

export const processDelete = async (
  stepTable: DataTable,
  pageObject: Public | Resource,
  actionType: string
) => {
  let files, parentFolder
  const deleteInfo = stepTable
    .hashes()
    .reduce<Record<string, { name: string }[]>>((acc, stepRow) => {
      const { resource, from } = stepRow
      const resourceInfo = {
        name: resource
      }
      if (!acc[from]) {
        acc[from] = []
      }
      acc[from].push(resourceInfo)
      return acc
    }, {})

  for (const folder of Object.keys(deleteInfo)) {
    files = deleteInfo[folder]
    parentFolder = folder !== 'undefined' ? folder : null
    await pageObject.delete({
      folder: parentFolder,
      resourcesWithInfo: files,
      via: actionType === 'batch action' ? 'BATCH_ACTION' : 'SIDEBAR_PANEL'
    })
  }
}

export const processDownload = async (
  stepTable: DataTable,
  pageObject: Public | Resource,
  actionType: string
) => {
  let downloads, files, parentFolder
  const downloadedResources: string[] = []
  const downloadInfo = stepTable
    .hashes()
    .reduce<Record<string, { name: string; type: string }[]>>((acc, stepRow) => {
      const { resource, from, type } = stepRow
      const resourceInfo = {
        name: resource,
        type: type
      }
      if (!acc[from]) {
        acc[from] = []
      }

      acc[from].push(resourceInfo)

      return acc
    }, {})

  for (const folder of Object.keys(downloadInfo)) {
    files = downloadInfo[folder]
    parentFolder = folder !== 'undefined' ? folder : null

    let via: ActionViaType = 'SINGLE_SHARE_VIEW'
    switch (actionType) {
      case 'batch action':
        via = 'BATCH_ACTION'
        break
      case 'sidebar panel':
        via = 'SIDEBAR_PANEL'
        break
      case 'preview topbar':
        via = 'PREVIEW_TOPBAR'
        break
      default:
        break
    }

    downloads = await pageObject.download({
      folder: parentFolder,
      resources: files,
      via
    })

    downloads.forEach((download) => {
      downloadedResources.push(download.suggestedFilename())
    })

    if (actionType === 'sidebar panel' || actionType === 'preview topbar') {
      expect(downloads.length).toBe(files.length)
      for (const resource of files) {
        if (resource.type === 'file') {
          expect(downloadedResources).toContain(resource.name)
        } else {
          expect(downloadedResources).toContain(`${resource.name}.zip`)
        }
      }
    }
  }

  if (actionType === 'batch action') {
    expect(downloads.length).toBe(1)
    downloads.forEach((download) => {
      const { name } = path.parse(download.suggestedFilename())
      expect(name).toBe('download')
    })
  }
}

When(
  '{string} creates the following resource(s)',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    for (const info of stepTable.hashes()) {
      await resourceObject.create({
        name: info.resource,
        type: info.type as createResourceTypes,
        content: info.content,
        password: info.password
      })
    }
  }
)

When(
  /^"([^"]*)" deletes the following resource(?:s)? using the (sidebar panel|batch action)$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    stepTable: DataTable
  ) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await processDelete(stepTable, resourceObject, actionType)
  }
)

When(
  /^"([^"]*)" deletes the resource using the app topbar$/,
  async ({ world }: { world: World }, stepUser: string) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.deleteResourceViaAppTopbar()
  }
)

When(
  '{string} renames the following resource(s)',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    for (const { resource, as } of stepTable.hashes()) {
      await resourceObject.rename({ resource, newName: as })
    }
  }
)

When(
  /^"([^"]*)" (copies|moves) the following resource(?:s)? using (keyboard|drag-drop|drag-drop-breadcrumb|sidebar-panel|dropdown-menu|batch-action)$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    method: string,
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    // drag-n-drop always does MOVE
    if (method.includes('drag-drop')) {
      expect(actionType).toBe('moves')
    }

    for (const { resource, to, option } of stepTable.hashes()) {
      await resourceObject[actionType === 'copies' ? 'copy' : 'move']({
        resource,
        newLocation: to,
        method,
        option: option
      })
    }
  }
)

When(
  /^"([^"]*)" (copies|moves) the following resources to "([^"]*)" at once using (keyboard|drag-drop|drag-drop-breadcrumb|dropdown-menu|batch-action)$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    newLocation: string,
    method: string,
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    // drag-n-drop always does MOVE
    if (method.includes('drag-drop')) {
      expect(actionType).toBe('moves')
    }

    const resources = [].concat(...stepTable.rows())
    await resourceObject[
      actionType === 'copies' ? 'copyMultipleResources' : 'moveMultipleResources'
    ]({
      newLocation,
      method,
      resources
    })
  }
)

When(
  /^"([^"]*)" (copies|moves) the following resource to a new folder "([^"]*)"( with copy instead)?$/,
  async (
    { world }: { world: World },
    stepUser: string,
    action: string,
    newLocation: string,
    copyInstead: string,
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const resources = stepTable.rows().flat()
    const actionFn =
      action === 'copies'
        ? 'copyResourcesWithCreateDestination'
        : 'moveResourcesWithCreateDestination'

    await resourceObject[actionFn]({
      resources,
      newLocation,
      copyInstead: !!copyInstead
    })
  }
)

When(
  '{string} edits the following resource(s)',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    for (const info of stepTable.hashes()) {
      await resourceObject.editResource({
        name: info.resource,
        type: info.type,
        content: info.content
      })
    }
  }
)

When(
  '{string} creates space {string} from folder {string} using the context menu',
  async ({ world }: { world: World }, stepUser: string, spaceName: string, folderName: string) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const space = await resourceObject.createSpaceFromFolder({
      folderName: folderName,
      spaceName: spaceName
    })
    world.spacesEnvironment.createSpace({
      key: space.name,
      space: { name: space.name, id: space.id }
    })
  }
)

When(
  '{string} creates space {string} from resources using the context menu',
  async (
    { world }: { world: World },
    stepUser: string,
    spaceName: string,
    stepTable: DataTable
  ) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const resources = stepTable.hashes().map((item) => item.resource)
    const space = await resourceObject.createSpaceFromSelection({ resources, spaceName })
    world.spacesEnvironment.createSpace({
      key: space.name,
      space: { name: space.name, id: space.id }
    })
  }
)

When(
  '{string} creates space {string} from all resources using the context menu',
  async ({ world }: { world: World }, stepUser: string, spaceName: string) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const space = await resourceObject.createSpaceFromAll({ spaceName })
    world.spacesEnvironment.createSpace({
      key: space.name,
      space: { name: space.name, id: space.id }
    })
  }
)

When('{string} selects all files', async ({ world }: { world: World }, stepUser: string) => {
  const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
  await resourceObject.selectAllFiles()
})

When('{string} deletes all files', async ({ world }: { world: World }, stepUser: string) => {
  const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
  await resourceObject.selectAllFiles()
  await resourceObject.deleteAllFiles()
})

When(
  '{string} deletes and immediately undoes the following resource(s) using {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    method: 'keyboard' | 'undo button',
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const resources = stepTable.hashes().map((row) => ({
      name: row.resource
    }))

    await resourceObject.deleteAndUndoResource({
      method,
      resourcesWithInfo: resources,
      via: 'BATCH_ACTION'
    })
  }
)

When(
  '{string} copies all resource from folder {string} to folder {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    source: string,
    destination: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    await resourceObject.copyAllTo(source, destination)
  }
)
