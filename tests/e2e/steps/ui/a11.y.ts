import { Then, When } from '../../environment/fixtures'
import { World } from '../../environment/world'
import { checkA11yOrLocalization } from '../../support/utils/accessibility'
import { actorPage } from '../../environment/pageObject'

const viewports = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 412, height: 915 }
}

Then(
  '{string} checks the accessibility of the DOM selector {string} on the {string}',
  async ({ world }: { world: World }, stepUser: string, selector: string, context: string) => {
    const page = actorPage(world, stepUser)
    await checkA11yOrLocalization(page, context, selector)
  }
)

Then(
  '{string} checks the accessibility of the whole page on the {string}',
  async ({ world }: { world: World }, stepUser: string, context: string) => {
    const page = actorPage(world, stepUser)
    await checkA11yOrLocalization(page, context)
  }
)

When(
  '{string} switches to the {string} viewport',
  async ({ world }: { world: World }, stepUser: string, viewport: string) => {
    const size = viewports[viewport as keyof typeof viewports]
    if (!size) {
      throw new Error(`Unknown viewport: ${viewport}`)
    }
    await actorPage(world, stepUser).setViewportSize(size)
  }
)

When(
  '{string} expands the select {string}',
  async ({ world }: { world: World }, stepUser: string, selector: string) => {
    const page = actorPage(world, stepUser)
    await page.locator(selector).locator('.vs__search').click()
    await page.locator('.vs__dropdown-menu').waitFor()
  }
)

When(
  '{string} collapses the expanded select',
  async ({ world }: { world: World }, stepUser: string) => {
    const page = actorPage(world, stepUser)
    await page.keyboard.press('Escape')
    await page.locator('.vs__dropdown-menu').waitFor({ state: 'detached' })
  }
)
