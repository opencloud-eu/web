import { When, Then } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { expect } from '@playwright/test'
import { appConfig } from '../../playwright.config'
import { shortcutType, PanelType } from '../../support/objects/app-files/resource/actions'
import { waitProcessingToFinish } from '../../support/objects/app-files/fileEvents'
import { pageObjectFor, actorPage } from '../../environment/pageObject'

Then(
  /^following resources? (should|should not) be displayed in the (?:files list|Shares|trashbin) for user "([^"]*)"$/,
  async (
    { world }: { world: World },
    actionType: string,
    stepUser: string,
    stepTable: DataTable
  ): Promise<void> => {
    const page = actorPage(world, stepUser)
    const resourceObject = new objects.applicationFiles.Resource({ page })
    const isFavoritesPage = page.url().includes('/favorites')

    for (const info of stepTable.hashes()) {
      if (isFavoritesPage) {
        // In the favorites page, the resource may not be immediately visible due the search index update delay.
        await expect(async () => {
          const isVisible = await resourceObject.getResourceLocator(info.resource).isVisible()
          if (isVisible !== (actionType === 'should')) {
            await page.reload()
            await page.locator('#app-loading-spinner').waitFor({ state: 'detached' })
          }
          expect(isVisible).toBe(actionType === 'should')
        }).toPass({ timeout: appConfig.timeout * 1000 })
      } else if (actionType === 'should') {
        await expect(resourceObject.getResourceLocator(info.resource)).toBeVisible({
          timeout: appConfig.timeout * 1000
        })
      } else {
        await expect(resourceObject.getResourceLocator(info.resource)).not.toBeVisible()
      }

      if (actionType === 'should') {
        await waitProcessingToFinish(page, info.resource)
      }
    }
  }
)

Then(
  '{string} should not be able to share following resource(s) from the space {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    space: string,
    stepTable: DataTable
  ): Promise<void> => {
    const page = actorPage(world, stepUser)
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    const resourceObject = new objects.applicationFiles.Resource({ page })

    await spacesObject.expectOpen({ key: space })
    for (const info of stepTable.hashes()) {
      await resourceObject.expectNotShareable({ resource: info.resource })
    }
  }
)

When(
  '{string} opens file/folder {string}',
  async ({ world }: { world: World }, stepUser: string, resource: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.openFolder(resource)
  }
)

When(
  '{string} navigates to folder {string} via breadcrumb',
  async ({ world }: { world: World }, stepUser: string, resource: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.openFolderViaBreadcrumb(resource)
  }
)

When(
  '{string} enables/disables the option to display the hidden file',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.showHiddenFiles()
  }
)

When(
  '{string} switches to the {string} view',
  async (
    { world }: { world: World },
    stepUser: string,
    viewMode: 'table' | 'tiles' | 'table-condensed'
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.switchViewMode(viewMode)
  }
)

When(
  '{string} sees the resources displayed as {string}',
  async ({ world }: { world: World }, stepUser: string, viewMode: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.expectThatResourcesAreDisplayedAs(viewMode)
  }
)

When(
  /^"([^"].*)" creates a file from template file "([^"].*)" via "([^"].*)" using the (sidebar panel|context menu)$/,
  async (
    { world }: { world: World },
    stepUser: string,
    file: string,
    webOffice: string,
    via: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.createFileFromTemplate(file, webOffice, via)
  }
)

When(
  '{string} opens template file {string} via {string} using the context menu',
  async ({ world }: { world: World }, stepUser: any, file: any, webOffice: any): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.openTemplateFile(file, webOffice)
  }
)

When(
  '{string} navigates to page {string} of the personal/project space files view',
  async ({ world }: { world: World }, stepUser: string, pageNumber: string) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.changePage({ pageNumber })
  }
)

When(
  '{string} changes the items per page to {string}',
  async ({ world }: { world: World }, stepUser: string, itemsPerPage: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.changeItemsPerPage({ itemsPerPage })
  }
)

Then(
  '{string} should see the text {string} at the footer of the page',
  async ({ world }: { world: World }, stepUser: string, expectedText: string) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const actualText = await resourceObject.getFileListFooterText()
    expect(actualText).toBe(expectedText)
  }
)

Then(
  '{string} should see {int} resources in the personal/project space files view',
  async ({ world }: { world: World }, stepUser: string, expectedNumberOfResources: number) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const actualNumberOfResources = await resourceObject.countNumberOfResourcesInThePage()
    expect(actualNumberOfResources).toBe(expectedNumberOfResources)
  }
)

Then(
  '{string} should not see the pagination in the personal/project space files view',
  async ({ world }: { world: World }, stepUser: string) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.expectPageNumberNotToBeVisible()
  }
)

When(
  '{string} navigates to page {string} of the files list',
  async ({ world }: { world: World }, stepUser: string, pageNumber: string) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.changePage({ pageNumber })
  }
)

Then(
  '{string} should see {int} resource(s) in the files/spaces list',
  async ({ world }: { world: World }, stepUser: string, expectedNumberOfResources: number) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const actualNumberOfResources = await resourceObject.countNumberOfResourcesInThePage()
    expect(actualNumberOfResources).toBe(expectedNumberOfResources)
  }
)

Then(
  '{string} should see the pagination in the files/spaces list',
  async ({ world }: { world: World }, stepUser: string) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.expectPageNumberToBeVisible()
  }
)

Then(
  '{string} should not see the pagination in the files/spaces list',
  async ({ world }: { world: World }, stepUser: string) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.expectPageNumberNotToBeVisible()
  }
)

When(
  '{string} creates a shortcut for the following resource(s)',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    for (const info of stepTable.hashes()) {
      await resourceObject.createShotcut({
        resource: info.resource,
        name: info.name,
        type: info.type as shortcutType
      })
    }
  }
)

When(
  '{string} opens a shortcut {string}',
  async ({ world }: { world: World }, stepUser: string, name: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.openShotcut({ name: name })
  }
)

Then(
  '{string} can open a shortcut {string} with external url {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    name: string,
    url: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.openShotcut({ name: name, url: url })
  }
)

Then(
  /^"([^"]*)" (should|should not) be able to edit (?:folder|file) "([^"]*)"$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    resource: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const userCanEdit = await resourceObject.canManageResource({ resource })
    expect(userCanEdit).toBe(actionType === 'should' ? true : false)
  }
)

Then(
  /^"([^"]*)" (should|should not) see (link-direct|link-indirect|user-direct|user-indirect) indicator on the (?:folder|file) "([^"]*)"$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    buttonLabel: string,
    resource: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const showShareIndicator = resourceObject.showShareIndicatorSelector({
      buttonLabel,
      resource
    })
    actionType === 'should'
      ? await expect(showShareIndicator).toBeVisible()
      : await expect(showShareIndicator).not.toBeVisible()
  }
)

Then(
  /^"([^"]*)" (should|should not) be able to edit content of following resources?$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    for (const info of stepTable.hashes()) {
      const canEdit = await resourceObject.canEditContent({ type: info.type })
      expect(canEdit).toBe(actionType === 'should')
    }
  }
)

Then(
  /^"([^"]*)" (should|should not) see following actions for (?:folder|file) "([^"]*)"$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    resource: string,
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    for (const info of stepTable.hashes()) {
      const actions = await resourceObject.getAllAvailableActions({ resource })
      if (actionType === 'should') {
        expect(actions.some((action) => action.startsWith(info.action))).toBe(true)
      } else {
        expect(actions.some((action) => action.startsWith(info.action))).toBe(false)
      }
    }
  }
)

Then(
  '{string} should see activity of the following resource(s)',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    for (const info of stepTable.hashes()) {
      await resourceObject.checkActivity({ resource: info.resource, activity: info.activity })
    }
  }
)

Then(
  '{string} should not see any activity of the following resource(s)',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    for (const info of stepTable.hashes()) {
      await resourceObject.checkEmptyActivity({ resource: info.resource })
    }
  }
)

Then(
  '{string} should see {string} avatar for the resource {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    avatarType: 'sharer' | 'recipient',
    resource: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const avatarLocator = await resourceObject.getAvatarLocator({ resource, avatarType })
    await expect(avatarLocator).toBeVisible()
  }
)

Then(
  '{string} should see {string} avatar for the resource {string} in the activity panel',
  async (
    { world }: { world: World },
    stepUser: string,
    avatarUser: string,
    resource: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const avatarLocator = await resourceObject.getAvatarLocatorFromActivityPanel({
      resource,
      avatarUser
    })
    await expect(avatarLocator).toBeVisible()
  }
)

When(
  '{string} reduces the tile size',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.reduceTileSize()
  }
)

When(
  '{string} opens the right sidebar of the resource {string}',
  async ({ world }: { world: World }, stepUser: string, resource: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.openRightSidebar(resource)
  }
)

Then(
  '{string} should see the file details in the sidebar',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.checkFileDetailsSidebar()
  }
)

When(
  '{string} opens a {string} panel of the resource {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    panel: string,
    resource: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.openResourcePanel(panel as PanelType, resource)
  }
)

When(
  '{string} marks the following resource(s) as favorite using {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    method: 'context menu' | 'sidebar panel' | 'batch action' | 'preview',
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const resources = stepTable.hashes().map((row) => row.resource)

    await resourceObject.markAsFavorite({ method, resources })
  }
)

Then(
  '{string} should see expiration date indicator on {string} for folder/file {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    context: 'publiclink' | 'share',
    resource: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const locator = await resourceObject.showExpirationDateIndicator(resource, context)
    await expect(locator).toBeVisible()
  }
)

When(
  '{string} enters the vault {string} with passphrase {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    vault: string,
    passphrase: string
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.enterVault({ vault, passphrase: passphrase })
  }
)

When(
  '{string} fails to enter the vault {string} with the wrong passphrase {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    vault: string,
    passphrase: string
  ): Promise<void> => {
    const page = actorPage(world, stepUser)
    const resourceObject = new objects.applicationFiles.Resource({ page })
    await resourceObject.enterVault({ vault, passphrase: passphrase })
    await expect(page.getByText('Incorrect password.')).toBeVisible()
    expect(page.url()).toContain('/rclone-crypt/unlock')
  }
)

When(
  '{string} sets the vault password {string}',
  async ({ world }: { world: World }, stepUser: string, password: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    await resourceObject.setupVaultPassword(password)
  }
)

When(
  '{string} locks the vault {string}',
  async ({ world }: { world: World }, stepUser: string, vault: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    await resourceObject.lockVault(vault)
  }
)
