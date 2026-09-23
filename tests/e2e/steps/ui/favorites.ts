import { When } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { pageObjectFor } from '../../environment/pageObject'

When(
  '{string} navigates to the favorites page',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const pageObject = pageObjectFor(
      world,
      stepUser,
      objects.applicationFiles.page.favorites.Favorites
    )
    await pageObject.navigate()
  }
)

When(
  '{string} removes the following resource(s) from favorites using {string}',
  async (
    { world }: { world: World },
    stepUser: string,
    method: 'context menu' | 'sidebar panel' | 'batch action',
    stepTable: DataTable
  ): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const resources = stepTable.hashes().map((row) => row.resource)

    await resourceObject.unmarkAsFavorite({ method, resources })
  }
)
