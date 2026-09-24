import { Given, When, Then } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { expect } from '@playwright/test'
import { pageObjectFor } from '../../environment/pageObject'

Given(
  '{string} generates invitation token for the federation share',
  async ({ world }: { world: World }, stepUser: any): Promise<void> => {
    const pageObject = pageObjectFor(world, stepUser, objects.scienceMesh.Federation)
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    await pageObject.generateInvitation(user.id)
  }
)

When(
  '{string} accepts federated share invitation by local user {string}',
  async ({ world }: { world: World }, stepUser: string, sharer: string): Promise<void> => {
    const pageObject = pageObjectFor(world, stepUser, objects.scienceMesh.Federation)
    await pageObject.acceptInvitation(sharer)
  }
)

Then(
  '{string} should see the following federated connections:',
  async ({ world }: { world: World }, stepUser: any, stepTable: DataTable): Promise<void> => {
    const pageObject = pageObjectFor(world, stepUser, objects.scienceMesh.Federation)
    for (const info of stepTable.hashes()) {
      const isConnectionExist = await pageObject.connectionExists(info)
      await expect(isConnectionExist).toBeTruthy()
    }
  }
)
