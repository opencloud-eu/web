import { extractStorageId, SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '../clientService'
import {
  useExtensionRegistry,
  useMessages,
  useResourcesStore,
  useSpacesStore
} from '../piniaStores'
import { useGettext } from 'vue3-gettext'
import { getVaultCreator } from '../../helpers'
import type { VaultFinalize } from '../piniaStores'

export const useCreateSpace = () => {
  const clientService = useClientService()
  const resourcesStore = useResourcesStore()
  const { $gettext } = useGettext()
  const spacesStore = useSpacesStore()
  const extensionRegistry = useExtensionRegistry()
  const { upsertResource } = useResourcesStore()
  const { showMessage, showErrorMessage } = useMessages()

  /**
   * `vaultContentType` turns the new space into an end-to-end encrypted one: it
   * lands in the drive's `@libre.graph.contentType`. Such a space must not get the
   * default template, or the server would create a `.space` folder.
   */
  const createSpace = (name: string, { vaultContentType }: { vaultContentType?: string } = {}) => {
    const { graphAuthenticated } = clientService
    return graphAuthenticated.drives.createDrive(
      { name, ...(vaultContentType && { '@libre.graph.contentType': vaultContentType }) },
      { params: { template: vaultContentType ? 'none' : 'default' } }
    )
  }

  const createDefaultMetaFolder = async (space: SpaceResource) => {
    const spaceFolder = await clientService.webdav.createFolder(space, { path: '.space' })
    if (extractStorageId(spaceFolder.parentFolderId) === resourcesStore.currentFolder?.id) {
      resourcesStore.upsertResource(spaceFolder)
    }

    return spaceFolder
  }

  const addNewSpace = async (
    name: string,
    { encrypt = false, finalizeVault }: { encrypt?: boolean; finalizeVault?: VaultFinalize } = {}
  ) => {
    try {
      const creation = getVaultCreator(extensionRegistry)?.creation
      if (encrypt && !creation) {
        // Better to fail loudly than to hand back an unencrypted space to
        // someone who asked for an encrypted one.
        throw new Error('no vault scheme available to create an encrypted space')
      }
      const createdSpace = await createSpace(name, {
        vaultContentType: encrypt ? creation.vaultContentType : undefined
      })
      upsertResource(createdSpace)
      spacesStore.upsertSpace(createdSpace)

      if (encrypt && finalizeVault) {
        try {
          // A vault space is encrypted all the way down, so its vault root is
          // the space root.
          await finalizeVault(createdSpace, '/')
        } catch (error) {
          // The space exists and is a vault, only its secret didn't get
          // committed - saying "failed to create" would be a lie.
          console.error(error)
          showErrorMessage({
            title: $gettext('»%{space}« was created, but its password was not saved', {
              space: name
            }),
            errors: [error]
          })
          return createdSpace
        }
      }

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
