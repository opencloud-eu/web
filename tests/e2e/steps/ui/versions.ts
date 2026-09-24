import { When, Then } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { File } from '../../support/types'
import { pageObjectFor } from '../../environment/pageObject'

When(
  '{string} restores following resource(s) version',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const fileInfo = stepTable.hashes().reduce<Record<string, any>>((acc, stepRow) => {
      const { to, resource, version, openDetailsPanel } = stepRow

      if (!acc[to]) {
        acc[to] = []
      }

      acc[to].push(world.filesEnvironment.getFile({ name: resource }))

      if (version !== '1') {
        throw new Error('restoring is only supported for the most recent version')
      }
      acc[to]['openDetailsPanel'] = openDetailsPanel === 'true'

      return acc
    }, {})
    for (const folder of Object.keys(fileInfo)) {
      await resourceObject.restoreVersion({
        folder,
        files: fileInfo[folder],
        openDetailsPanel: fileInfo[folder]['openDetailsPanel']
      })
    }
  }
)

When(
  '{string} downloads old version of the following resource(s)',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const fileInfo = stepTable.hashes().reduce<Record<string, File[]>>((acc, stepRow) => {
      const { to, resource } = stepRow

      if (!acc[to]) {
        acc[to] = []
      }

      acc[to].push(world.filesEnvironment.getFile({ name: resource }))

      return acc
    }, {})

    for (const folder of Object.keys(fileInfo)) {
      await resourceObject.downloadVersion({ folder, files: fileInfo[folder] })
    }
  }
)

Then(
  '{string} should not see the version panel for the file(s)',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const fileInfo = stepTable.hashes().reduce<Record<string, File[]>>((acc, stepRow) => {
      const { to, resource } = stepRow

      if (!acc[to]) {
        acc[to] = []
      }

      acc[to].push(world.filesEnvironment.getFile({ name: resource }))

      return acc
    }, {})

    for (const folder of Object.keys(fileInfo)) {
      await resourceObject.checkThatFileVersionPanelIsNotAvailable({
        folder,
        files: fileInfo[folder]
      })
    }
  }
)
