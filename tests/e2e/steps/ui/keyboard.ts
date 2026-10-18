import { DataTable } from 'playwright-bdd'
import { expect } from '@playwright/test'
import { Then, When } from '../../environment/fixtures'
import { World } from '../../environment/world'
import { actorPage } from '../../environment/pageObject'
import {
  closeModalWithEscape,
  expectFocusInside,
  expectFocusNotLost,
  expectRowCheckboxesNamedByResource,
  expectSortButtonsNamedByVisibleLabel,
  getResourceCheckbox,
  openContextMenuAction,
  toggleResourceCheckboxWithSpace
} from '../../support/utils/keyboard'

When(
  '{string} presses the {string} key',
  async ({ world }: { world: World }, stepUser: string, key: string): Promise<void> => {
    await actorPage(world, stepUser).keyboard.press(key)
  }
)

When(
  '{string} presses the {string} key {int} times',
  async ({ world }: { world: World }, stepUser: string, key: string, times: number) => {
    const page = actorPage(world, stepUser)
    for (let i = 0; i < times; i++) {
      await page.keyboard.press(key)
    }
  }
)

When(
  '{string} clicks the element {string}',
  async ({ world }: { world: World }, stepUser: string, selector: string): Promise<void> => {
    await actorPage(world, stepUser).locator(selector).click()
  }
)

When(
  '{string} selects the resource {string} using the checkbox',
  async ({ world }: { world: World }, stepUser: string, resource: string): Promise<void> => {
    await getResourceCheckbox(actorPage(world, stepUser), resource).click()
  }
)

When(
  '{string} toggles the checkbox of resource {string} using the space key',
  async ({ world }: { world: World }, stepUser: string, resource: string): Promise<void> => {
    await toggleResourceCheckboxWithSpace(actorPage(world, stepUser), resource)
  }
)

When(
  '{string} opens the {string} action of resource {string} using the context menu',
  async ({ world }: { world: World }, stepUser: string, action: string, resource: string) => {
    await openContextMenuAction(actorPage(world, stepUser), resource, action)
  }
)

When(
  '{string} closes the modal using the escape key',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    await closeModalWithEscape(actorPage(world, stepUser))
  }
)

Then(
  '{string} should see the following resource selection',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const page = actorPage(world, stepUser)
    for (const { resource, selected } of stepTable.hashes()) {
      const checkbox = getResourceCheckbox(page, resource)
      if (selected === 'true') {
        await expect(checkbox).toBeChecked()
      } else {
        await expect(checkbox).not.toBeChecked()
      }
    }
  }
)

Then(
  '{string} should see the resource name in the accessible name of every row checkbox',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    await expectRowCheckboxesNamedByResource(actorPage(world, stepUser))
  }
)

Then(
  '{string} should see the visible label in the accessible name of every sort button',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    await expectSortButtonsNamedByVisibleLabel(actorPage(world, stepUser))
  }
)

Then(
  '{string} should not lose the keyboard focus',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    await expectFocusNotLost(actorPage(world, stepUser))
  }
)

Then(
  '{string} should see the keyboard focus inside {string}',
  async ({ world }: { world: World }, stepUser: string, selector: string): Promise<void> => {
    await expectFocusInside(actorPage(world, stepUser), selector)
  }
)

Then(
  '{string} should not see the element {string}',
  async ({ world }: { world: World }, stepUser: string, selector: string): Promise<void> => {
    await expect(actorPage(world, stepUser).locator(selector)).toHaveCount(0)
  }
)
