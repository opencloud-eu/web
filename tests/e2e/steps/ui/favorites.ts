import { When } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import { World } from '../../environment/world'
import { objects } from '../../support'

When(
  '{string} navigates to the favorites page',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const pageObject = new objects.applicationFiles.page.favorites.Favorites({ page })
    await pageObject.navigate()
  }
)

When(
  '{string} removes the following resources from favorites using {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    method: 'context menu' | 'batch action',
    stepTable: DataTable
  ): Promise<void> => {
    const { page } = world.actorsEnvironment.getActor({ key: stepUser })
    const resourceObject = new objects.applicationFiles.Resource({ page })
    const resources = stepTable.hashes().map((row) => row.resource)

    await resourceObject.unmarkAsFavorite({ method, resources })
  }
)
