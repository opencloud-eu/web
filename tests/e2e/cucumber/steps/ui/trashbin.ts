import { When, Then } from '@cucumber/cucumber'
import { World } from '../../environment'
import { objects } from '../../../support'
import { expect } from '@playwright/test'

When(
  '{string} enables/disables the option to show empty trashbins',
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const trashbinObject = new objects.applicationFiles.Trashbin({ page })
    await trashbinObject.showEmptyTrashbins()
  }
)

Then(
  '{string} should see disabled empty trashbin button for space {string}',
  async function (this: World, stepUser: string, space: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const trashbinObject = new objects.applicationFiles.Trashbin({ page })
    const emptyTrashbinBtn = await trashbinObject.getEmptyTrashbinLocator(space)
    await expect(emptyTrashbinBtn).toBeDisabled()
  }
)

When(
  '{string} empties the trashbin for space {string} using quick action',
  async function (this: World, stepUser: string, space: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const trashbinObject = new objects.applicationFiles.Trashbin({ page })
    await trashbinObject.emptyTrashbinUsingQuickAction(space)
  }
)

Then(
  '{string} should see the text {string} at the footer of the trashbin page',
  async function (this: World, stepUser: string, expectedText: string) {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const trashbinObject = new objects.applicationFiles.Trashbin({ page })
    const actualText = await trashbinObject.getTrashbinListFooterText()
    expect(actualText).toContain(expectedText)
  }
)

When(
  '{string} navigates to the trashbin',
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const pageObject = new objects.applicationFiles.page.trashbin.Overview({ page })
    await pageObject.navigate()
  }
)

When(
  '{string} opens trashbin of the project space {string}',
  async function (this: World, stepUser: string, key: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const trashbinObject = new objects.applicationFiles.Trashbin({ page })
    await trashbinObject.openTrashbinOfProjectSpace(key)
  }
)

When(
  '{string} opens trashbin of the personal space',
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const trashbinObject = new objects.applicationFiles.Trashbin({ page })
    await trashbinObject.openTrashbinOfPersonalSpace()
  }
)
