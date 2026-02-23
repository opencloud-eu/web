import { extractStorageId, SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '../clientService'
import { useMessages, useResourcesStore, useSpacesStore } from '../piniaStores'
import { useGettext } from 'vue3-gettext'

export const useCreateSpace = () => {
  const clientService = useClientService()
  const resourcesStore = useResourcesStore()
  const { $gettext } = useGettext()
  const spacesStore = useSpacesStore()
  const { upsertResource } = useResourcesStore()
  const { showMessage, showErrorMessage } = useMessages()

  const createSpace = (name: string) => {
    const { graphAuthenticated } = clientService
    return graphAuthenticated.drives.createDrive({ name }, { params: { template: 'default' } })
  }

  const createDefaultMetaFolder = async (space: SpaceResource) => {
    const spaceFolder = await clientService.webdav.createFolder(space, { path: '.space' })
    if (extractStorageId(spaceFolder.parentFolderId) === resourcesStore.currentFolder?.id) {
      resourcesStore.upsertResource(spaceFolder)
    }

    return spaceFolder
  }

  const addNewSpace = async (name: string) => {
    try {
      const createdSpace = await createSpace(name)
      upsertResource(createdSpace)
      spacesStore.upsertSpace(createdSpace)
      showMessage({ title: $gettext('Space was created successfully') })
      return createdSpace
    } catch (error) {
      console.error(error)
      showErrorMessage({
        title: $gettext('Creating space failed…'),
        errors: [error]
      })
    }
  }

  return { createSpace, createDefaultMetaFolder, addNewSpace }
}
