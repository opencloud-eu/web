import { When } from '../../environment/fixtures'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { waitForSSEEvent } from '../../support/utils/locator'
import { pageObjectFor, actorPage } from '../../environment/pageObject'

When(
  '{string} navigates to the project spaces management page',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const pageObject = pageObjectFor(world, stepUser, objects.applicationAdminSettings.page.Spaces)
    await pageObject.navigate()
  }
)

When(
  '{string} opens the {string} app',
  async ({ world }: { world: World }, stepUser: string, stepApp: string): Promise<void> => {
    const applicationObject = pageObjectFor(world, stepUser, objects.runtime.Application)
    await applicationObject.open({ name: stepApp })
  }
)

When(
  '{string} opens the apps menu',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const applicationObject = pageObjectFor(world, stepUser, objects.runtime.Application)
    await applicationObject.openAppsMenu()
  }
)

When(
  '{string} reloads the page',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const applicationObject = pageObjectFor(world, stepUser, objects.runtime.Application)
    await applicationObject.reloadPage()
  }
)

When(
  '{string} should get {string} SSE event',
  async ({}: { world: World }, user: string, event: string): Promise<void> => {
    await waitForSSEEvent(user, event)
  }
)

When(
  '{string} opens the {string} url',
  async ({ world }: { world: World }, stepUser: string, url: string): Promise<void> => {
    const page = actorPage(world, stepUser)
    const applicationObject = new objects.runtime.Application({ page })
    url = url === '%clipboard%' ? await page.evaluate('navigator.clipboard.readText()') : url
    await applicationObject.openUrl(url)
  }
)

When(
  '{string} closes the sidebar',
  async ({ world }: { world: World }, user: string): Promise<void> => {
    const applicationObject = pageObjectFor(world, user, objects.runtime.Application)
    await applicationObject.closeSidebar()
  }
)
