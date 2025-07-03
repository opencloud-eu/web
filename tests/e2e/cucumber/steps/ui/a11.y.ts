import { Then } from '@cucumber/cucumber'
import { World } from '../../environment'
import { checkAccessibility } from '../../../support/utils/accessibility'

Then(
  '{string} checks the accessibility of the DOM selector {string} on the {string}',
  async function (this: World, stepUser: string, selector: string, context: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    await checkAccessibility(page, context, selector)
  }
)
