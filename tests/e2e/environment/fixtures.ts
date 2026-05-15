import { test as base } from 'playwright-bdd'
import { createBdd } from 'playwright-bdd'
import { World } from '../environment/world'
import { state } from '../environment/shared'

export type MyFixtures = {
  world: World
}

export const test = base.extend<MyFixtures>({
  world: async ({ browser }, use, testInfo) => {
    state.browser = browser
    state.projectName = testInfo.project.name
    const world = new World()

    world.uniquePrefix = `test-${testInfo.testId}`
    world.tags = testInfo.tags
    await use(world)
  }
})

export const { Given, When, Then, Before, After, AfterAll } = createBdd(test)
