import { When, Then } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { expect } from '@playwright/test'
import { pageObjectFor } from '../../environment/pageObject'
import { processDownload } from './resources'

When(
  /^"([^"]*)" downloads the following resource(?:s)? using the (sidebar panel|batch action|preview topbar)$/,
  async (
    { world }: { world: World },
    stepUser: string,
    actionType: string,
    stepTable: DataTable
  ) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await processDownload(stepTable, resourceObject, actionType)
  }
)

Then(
  'the download button should be disabled for user {string} with the tooltip:',
  async ({ world }: { world: World }, stepUser: string, tooltip: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const downloadButton = await resourceObject.getDownloadButtonTooltip()
    expect(downloadButton).toBe(tooltip)
  }
)
