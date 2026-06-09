import { isShareSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'
import { join } from 'path'
import { computed, nextTick, Ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  FileAction,
  resolveFileNameDuplicate,
  useClientService,
  useIsResourceNameValid,
  useMessages,
  useModals,
  useResourcesStore,
  useScrollTo
} from '@opencloud-eu/web-pkg'

export const useFileActionsCreateNewFolder = ({ space }: { space?: Ref<SpaceResource> } = {}) => {
  const { showMessage, showErrorMessage } = useMessages()
  const { dispatchModal } = useModals()
  const { $gettext } = useGettext()
  const { scrollToResource } = useScrollTo()

  const resourcesStore = useResourcesStore()
  const { resources, currentFolder } = storeToRefs(resourcesStore)

  const clientService = useClientService()
  const { isFileNameValid } = useIsResourceNameValid()

  const addNewFolder = async (folderName: string) => {
    folderName = folderName.trimEnd()

    try {
      const path = join(unref(currentFolder).path, folderName)
      const resource = await clientService.webdav.createFolder(unref(space), { path })

      // FIXME: move to buildResource as soon as it has space context
      if (isShareSpaceResource(unref(space))) {
        resource.remoteItemId = unref(space).id
      }

      resourcesStore.upsertResource(resource)

      showMessage({ title: $gettext('»%{folderName}« was created successfully', { folderName }) })

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
    let defaultName = $gettext('New folder')

    if (unref(resources).some((f) => f.name === defaultName)) {
      defaultName = resolveFileNameDuplicate(defaultName, '', unref(resources))
    }

    dispatchModal({
      title: $gettext('Create a new folder'),
      confirmText: $gettext('Create'),
      hasInput: true,
      inputValue: defaultName,
      inputLabel: $gettext('Folder name'),
      inputRequiredMark: true,
      onConfirm: addNewFolder,
      onInput: (folderName: string, setError: (error: string) => void) => {
        const resource = {
          path: join(unref(currentFolder).path, folderName),
          name: folderName,
          isFolder: true
        } as Resource
        const { isValid, error } = isFileNameValid(resource, folderName, unref(resources))
        return setError(isValid ? null : error)
      }
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
