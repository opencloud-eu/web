import { isShareSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'
import { join } from 'path'
import { computed, markRaw, nextTick, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  FileAction,
  FolderVaultFinalize,
  getVaultCreator,
  markVaultStatus,
  useClientService,
  useExtensionRegistry,
  useMessages,
  useModals,
  useResourcesStore,
  useScrollTo,
  withExtension,
  withoutExtension
} from '@opencloud-eu/web-pkg'
import CreateFolderModal from '../../../components/Modals/CreateFolderModal.vue'

export const useFileActionsCreateNewFolder = ({ space }: { space?: Ref<SpaceResource> } = {}) => {
  const { showMessage, showErrorMessage } = useMessages()
  const { dispatchModal } = useModals()
  const { $gettext } = useGettext()
  const { scrollToResource } = useScrollTo()

  const resourcesStore = useResourcesStore()
  const { currentFolder, areFileExtensionsShown } = storeToRefs(resourcesStore)

  const clientService = useClientService()
  const extensionRegistry = useExtensionRegistry()

  // The registered folder-vault extension, or undefined when there is none - which
  // is what hides the encryption switch.
  const vaultCreator = computed(() => {
    if (unref(currentFolder)?.isInVault) {
      // Cannot create a vault inside another vault.
      return undefined
    }
    return getVaultCreator(extensionRegistry)
  })

  const addNewFolder = async (
    folderName: string,
    {
      encrypt = false,
      finalizeVault
    }: { encrypt?: boolean; finalizeVault?: FolderVaultFinalize } = {}
  ) => {
    folderName = folderName.trimEnd()

    try {
      const creation = unref(vaultCreator)?.creation
      if (encrypt && !creation) {
        // Better to fail loudly than to hand back an unencrypted folder to
        // someone who asked for an encrypted one.
        throw new Error('no folder-vault scheme available to create an encrypted folder')
      }
      // The scheme decides how a vault root is named, we only apply it.
      const serverName = encrypt ? withExtension(folderName, creation.folderExtension) : folderName
      const displayName =
        encrypt && !unref(areFileExtensionsShown)
          ? withoutExtension(serverName, creation.folderExtension)
          : serverName
      const path = join(unref(currentFolder).path, serverName)
      const resource = await clientService.webdav.createFolder(unref(space), { path })

      // FIXME: move to buildResource as soon as it has space context
      if (isShareSpaceResource(unref(space))) {
        resource.remoteItemId = unref(space).id
      }

      markVaultStatus(extensionRegistry, unref(space), [resource])
      resourcesStore.upsertResource(resource)

      if (encrypt && finalizeVault) {
        try {
          await finalizeVault(unref(space), resource.path)
        } catch (error) {
          // The folder exists and is a vault, only its secret didn't get
          // committed - saying "failed to create" would be a lie.
          console.error(error)
          showErrorMessage({
            title: $gettext('»%{folderName}« was created, but its passphrase was not saved', {
              folderName: displayName
            }),
            errors: [error]
          })
          return
        }
      }

      showMessage({
        title: $gettext('»%{folderName}« was created successfully', { folderName: displayName })
      })

      await nextTick()
      scrollToResource(resource.id, { forceScroll: true, topbarElement: 'files-app-bar' })
    } catch (error) {
      console.error(error)
      showErrorMessage({
        title: $gettext('Failed to create folder'),
        errors: [error]
      })
    }
  }

  const handler = () => {
    dispatchModal({
      title: $gettext('Create a new folder'),
      focusTrapInitial: '#create-folder-input',
      customComponent: markRaw(CreateFolderModal),
      hideActions: true,
      customComponentAttrs: () => ({
        vaultCreation: unref(vaultCreator)?.creation,
        callbackFn: addNewFolder
      })
    })
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'create-folder',
      icon: 'folder',
      handler,
      label: () => {
        return $gettext('New Folder')
      },
      isVisible: () => {
        return unref(currentFolder)?.canCreate()
      },
      class: 'oc-files-actions-create-new-folder'
    }
  ])

  return {
    actions,
    addNewFolder
  }
}
