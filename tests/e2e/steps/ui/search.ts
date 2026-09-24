import { When, Then } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { pageObjectFor } from '../../environment/pageObject'
import { expect } from '@playwright/test'
import { appConfig } from '../../playwright.config'
import { searchFilter, SearchShortcutType } from '../../support/objects/app-files/resource/actions'

const searchIndexTimeout = 40 * 1000

Then(
  '{string} should see the message {string} on the search result',
  async ({ world }: { world: World }, stepUser: string, message: string): Promise<void> => {
    const searchObject = pageObjectFor(world, stepUser, objects.applicationFiles.Search)
    const actualMessage = await searchObject.getSearchResultMessage()
    expect(actualMessage).toBe(message)
  }
)

When(
  '{string} selects tag {string} from the search result filter chip',
  async ({ world }: { world: World }, stepUser: string, tag: string): Promise<void> => {
    const searchObject = pageObjectFor(world, stepUser, objects.applicationFiles.Search)
    await searchObject.selectTagFilter({ tag })
  }
)

When(
  /^"([^"]*)" (enable|disable)s the option to search title only?$/,
  async ({ world }: { world: World }, stepUser: string, enableOrDisable: string): Promise<void> => {
    const searchObject = pageObjectFor(world, stepUser, objects.applicationFiles.Search)
    await searchObject.toggleSearchTitleOnly({ enableOrDisable })
  }
)
When(
  '{string} selects mediaType {string} from the search result filter chip',
  async ({ world }: { world: World }, stepUser: string, mediaType: string): Promise<void> => {
    const searchObject = pageObjectFor(world, stepUser, objects.applicationFiles.Search)
    await searchObject.selectMediaTypeFilter({ mediaType })
  }
)
When(
  '{string} selects lastModified {string} from the search result filter chip',
  async ({ world }: { world: World }, stepUser: string, lastModified: string): Promise<void> => {
    const searchObject = pageObjectFor(world, stepUser, objects.applicationFiles.Search)
    await searchObject.selectlastModifiedFilter({ lastModified })
  }
)
When(
  /^"([^"].*)" clears (mediaType|tags|lastModified|fullText) filter$/,
  async ({ world }: { world: World }, stepUser: string, filter: string): Promise<void> => {
    const searchObject = pageObjectFor(world, stepUser, objects.applicationFiles.Search)
    await searchObject.clearFilter({
      filter: filter as 'mediaType' | 'tags' | 'lastModified' | 'fullText'
    })
  }
)

When(
  '{string} opens location search panel',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const searchObject = pageObjectFor(world, stepUser, objects.applicationFiles.Search)
    await searchObject.openLocationSearchPanel()
  }
)

When(
  /^"([^"]*)" searches "([^"]*)" using the global search(?: and the "([^"]*)" filter)?( and presses enter)?$/,
  async (
    { world }: { world: World },
    stepUser: string,
    keyword: string,
    filter: string,
    command: string
  ): Promise<void> => {
    keyword = keyword ?? ''
    const pressEnter = !!command && command.endsWith('presses enter')
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    world.lastGlobalSearch[stepUser] = { keyword, filter: filter as searchFilter, pressEnter }
    await resourceObject.searchResource({
      keyword,
      filter: filter as searchFilter,
      pressEnter
    })
  }
)

When(
  /^"([^"]*)" searches "([^"]*)" globally using "(s|\/)" keyboard shortcut$/,
  async (
    { world }: { world: World },
    stepUser: string,
    keyword: string,
    shortcut: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.searchResource({
      keyword,
      keyboardShortcut: shortcut as SearchShortcutType
    })
  }
)

When(
  '{string} clears the search using keyboard shortcut',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.clearSearchUsingKeyboardShortcut()
  }
)

Then(
  /^following resources? (should|should not) be displayed in the search list for user "([^"]*)"$/,
  async (
    { world }: { world: World },
    actionType: string,
    stepUser: string,
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    for (const info of stepTable.hashes()) {
      if (actionType === 'should') {
        const lastSearch = world.lastGlobalSearch[stepUser]
        let attempt = 0
        await expect(async () => {
          if (attempt++ > 0 && lastSearch) {
            await resourceObject.searchResource(lastSearch)
          }
          await expect(resourceObject.getResourceSearchItemLocator(info.resource)).toBeVisible({
            timeout: appConfig.minTimeout * 1000
          })
        }).toPass({ timeout: searchIndexTimeout })
      } else {
        await expect(resourceObject.getResourceSearchItemLocator(info.resource)).not.toBeVisible()
      }
    }
  }
)
