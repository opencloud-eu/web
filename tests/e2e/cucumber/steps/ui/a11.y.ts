import { Then } from '@cucumber/cucumber'
import { World } from '../../environment'
import { checkAccessibility } from '../../../support/utils/accessibility'

Then(
  '{string} check accessibility of the {string} page',
  async function (this: World, stepUser: string, place: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    await checkAccessibility(page, `personal space page`, place)
  }
)
