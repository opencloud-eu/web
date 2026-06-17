import { computed, unref, Ref } from 'vue'
import { SpaceResource, Resource } from '@opencloud-eu/web-client'
import { useClientService, useMessages, useResourcesStore } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { TypedFolderSchema } from './types'

export function useTypedFolderActions(
  space: Ref<SpaceResource>,
  currentFolder: Ref<Resource>,
  schema: Ref<TypedFolderSchema | null>,
  childSchemas: Ref<Map<string, TypedFolderSchema>>
) {
  const clientService = useClientService()
  const { $gettext } = useGettext()
  const { showMessage, showErrorMessage } = useMessages()
  const resourcesStore = useResourcesStore()

  async function createTypedFolder(childType: string, name: string) {
    const sp = unref(space)
    const folder = unref(currentFolder)
    if (!sp || !folder) return

    const path = folder.path.replace(/\/?$/, `/${name}`)

    try {
      // Create folder
      await clientService.webdav.createFolder(sp, { path })

      // Set type xattr via metadata API
      const httpClient = clientService.httpAuthenticated
      // We need the new folder's ID — re-fetch the parent to find it
      const { children } = await clientService.webdav.listFiles(sp, { path: folder.path })
      const newFolder = children.find((r) => r.name === name)

      if (newFolder) {
        await httpClient.put(
          `/graph/v1beta1/drives/${sp.id}/items/${newFolder.id}/metadata`,
          { type: childType }
        )

        // Update local state
        resourcesStore.upsertResource(newFolder)
      }

      const childSchema = unref(childSchemas).get(childType)
      const label = childSchema?.label || childType
      showMessage({ title: $gettext('%{label} "%{name}" created', { label, name }) })
    } catch (e) {
      showErrorMessage({
        title: $gettext('Failed to create folder'),
        errors: [e as Error]
      })
    }
  }

  const childActions = computed(() => {
    const s = unref(schema)
    if (!s?.children?.length) return []

    return s.children.map((childType) => {
      const childSchema = unref(childSchemas).get(childType)
      const label = childSchema?.label || childType
      const icon = childSchema?.icon || 'folder'

      return {
        type: childType,
        label: $gettext('New %{label}', { label }),
        icon,
        handler: (name: string) => createTypedFolder(childType, name)
      }
    })
  })

  return {
    childActions,
    createTypedFolder
  }
}
