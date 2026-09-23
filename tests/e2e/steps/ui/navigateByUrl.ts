import { When, Then } from '../../environment/fixtures'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { pageObjectFor } from '../../environment/pageObject'

When(
  '{string} navigates to {string} details panel of file {string} of space {string} through the URL',
  async (
    { world }: { world: World },
    stepUser: string,
    detailsPanel: string,
    resource: string,
    space: string
  ): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    const urlNavObject = pageObjectFor(world, stepUser, objects.urlNavigation.URLNavigation)
    await urlNavObject.navigateToDetailsPanelOfResource({ resource, detailsPanel, user, space })
  }
)

When(
  /^"([^"]*)" opens the (?:resource|file|folder) "([^"]*)" of space "([^"]*)" through the URL$/,
  async (
    { world }: { world: World },
    stepUser: string,
    resource: string,
    space: string
  ): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    const urlNavObject = pageObjectFor(world, stepUser, objects.urlNavigation.URLNavigation)
    await urlNavObject.openResourceViaUrl({ resource, user, space })
  }
)

When(
  /^"([^"]*)" opens the file "([^"]*)" of space "([^"]*)" in (CollaboraOnline|Euro-Office) through the URL for (mobile|desktop) client$/,
  async (
    { world }: { world: World },
    stepUser: string,
    resource: string,
    space: string,
    editorName: string,
    client: string
  ): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    const urlNavObject = pageObjectFor(world, stepUser, objects.urlNavigation.URLNavigation)
    await urlNavObject.openResourceViaUrl({ resource, user, space, editorName, client })
  }
)

When(
  '{string} opens space {string} through the URL',
  async ({ world }: { world: World }, stepUser: string, space: string): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    const urlNavObject = pageObjectFor(world, stepUser, objects.urlNavigation.URLNavigation)
    await urlNavObject.openSpaceViaUrl({ user, space })
  }
)

When(
  '{string} navigates to a non-existing page',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const urlNavObject = pageObjectFor(world, stepUser, objects.urlNavigation.URLNavigation)
    await urlNavObject.navigateToNonExistingPage()
  }
)

Then(
  '{string} should see the not found page',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const urlNavObject = pageObjectFor(world, stepUser, objects.urlNavigation.URLNavigation)
    await urlNavObject.waitForNotFoundPageToBeVisible()
  }
)
