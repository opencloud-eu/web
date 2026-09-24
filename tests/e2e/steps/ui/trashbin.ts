import { When, Then } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { pageObjectFor, actorPage } from '../../environment/pageObject'
import { expect } from '@playwright/test'

When(
  '{string} enables/disables the option to show empty trashbins',
  async function ({ world }: { world: World }, stepUser: string): Promise<void> {
    const trashbinObject = pageObjectFor(world, stepUser, objects.applicationFiles.Trashbin)
    await trashbinObject.showEmptyTrashbins()
  }
)

Then(
  '{string} should see disabled empty trashbin button for space {string}',
  async function ({ world }: { world: World }, stepUser: string, space: string): Promise<void> {
    const trashbinObject = pageObjectFor(world, stepUser, objects.applicationFiles.Trashbin)
    const emptyTrashbinBtn = await trashbinObject.getEmptyTrashbinLocator(space)
    await expect(emptyTrashbinBtn).toBeDisabled()
  }
)

Then(
  '{string} should see the deleted items indicator for space {string} in the trashbin',
  async function ({ world }: { world: World }, stepUser: string, space: string): Promise<void> {
    const trashbinObject = pageObjectFor(world, stepUser, objects.applicationFiles.Trashbin)
    await expect(trashbinObject.getTrashedItemsIndicatorLocator(space)).toBeVisible()
  }
)

When(
  '{string} empties the trashbin for space {string} using context menu',
  async function ({ world }: { world: World }, stepUser: string, space: string): Promise<void> {
    const trashbinObject = pageObjectFor(world, stepUser, objects.applicationFiles.Trashbin)
    await trashbinObject.emptyTrashbinUsingContextMenu(space)
  }
)

Then(
  '{string} should see the text {string} at the footer of the trashbin page',
  async function ({ world }: { world: World }, stepUser: string, expectedText: string) {
    const trashbinObject = pageObjectFor(world, stepUser, objects.applicationFiles.Trashbin)
    const actualText = await trashbinObject.getTrashbinListFooterText()
    expect(actualText).toContain(expectedText)
  }
)

When(
  '{string} navigates to the trashbin',
  async function ({ world }: { world: World }, stepUser: string): Promise<void> {
    const pageObject = pageObjectFor(
      world,
      stepUser,
      objects.applicationFiles.page.trashbin.Overview
    )
    await pageObject.navigate()
  }
)

When(
  '{string} opens trashbin of the project space {string}',
  async function ({ world }: { world: World }, stepUser: string, key: string): Promise<void> {
    const trashbinObject = pageObjectFor(world, stepUser, objects.applicationFiles.Trashbin)
    await trashbinObject.openTrashbinOfProjectSpace(key)
  }
)

When(
  '{string} opens trashbin of the personal space',
  async function ({ world }: { world: World }, stepUser: string): Promise<void> {
    const trashbinObject = pageObjectFor(world, stepUser, objects.applicationFiles.Trashbin)
    await trashbinObject.openTrashbinOfPersonalSpace()
  }
)

When(
  '{string} deletes the following resources from trashbin using the batch action',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const resources = [].concat(...stepTable.rows())
    await resourceObject.deleteTrashbinMultipleResources({ resources })
  }
)

When(
  '{string} empties the trashbin',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    const resourceObject = new objects.applicationFiles.Resource({ page })
    await resourceObject.emptyTrashbin({ page })
  }
)

Then(
  /^"([^"]*)" (should|should not) be able to delete following resource(?:s)? from the trashbin?$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    for (const info of stepTable.hashes()) {
      if (actionType === 'should') {
        const message = await resourceObject.deleteTrashBin({ resource: info.resource })
        const paths = info.resource.split('/')
        expect(message).toBe(`"${paths[paths.length - 1]}" was deleted successfully`)
      } else {
        await resourceObject.expectThatDeleteTrashBinButtonIsNotVisible({ resource: info.resource })
      }
    }
  }
)

Then(
  /^"([^"]*)" (should|should not) be able to restore following resource(?:s)? from the trashbin?$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    for (const info of stepTable.hashes()) {
      if (actionType === 'should') {
        const message = await resourceObject.restoreTrashBin({
          resource: info.resource
        })
        const paths = info.resource.split('/')
        expect(message).toBe(`${paths[paths.length - 1]} was restored successfully`)
      } else {
        await resourceObject.expectThatRestoreTrashBinButtonIsNotVisible({
          resource: info.resource
        })
      }
    }
  }
)

Then(
  /^"([^"]*)" restores the following resource(?:s)? from trashbin( using the batch action)?$/,
  async (
    { world }: { world: World },
    stepUser: string,
    batchAction: string,
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    if (batchAction) {
      const resources = stepTable.hashes().map((info) => info.resource)
      const message = await resourceObject.batchRestoreTrashBin({ resources })
      expect(message).toBe(`${resources.length} files restored successfully`)
    } else {
      for (const info of stepTable.hashes()) {
        const message = await resourceObject.restoreTrashBin({ resource: info.resource })
        const paths = info.resource.split('/')
        expect(message).toBe(`${paths[paths.length - 1]} was restored successfully`)
      }
    }
  }
)
