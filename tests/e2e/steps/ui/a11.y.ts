import { Then } from '../../environment/fixtures'
import { World } from '../../environment/world'
import { checkA11yOrLocalization } from '../../support/utils/accessibility'
import { actorPage } from '../../environment/pageObject'

Then(
  '{string} checks the accessibility of the DOM selector {string} on the {string}',
  async ({ world }: { world: World }, stepUser: string, selector: string, context: string) => {
    const page = actorPage(world, stepUser)
    await checkA11yOrLocalization(page, context, selector)
  }
)
