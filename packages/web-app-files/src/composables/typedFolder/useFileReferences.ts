import { ref, unref, watch, Ref, computed } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '@opencloud-eu/web-pkg'

/**
 * Loads oy.fileReference metadata for a list of resources.
 * Returns a Map<resourceId, fileReference>.
 */
export function useFileReferences(
  space: Ref<SpaceResource>,
  resources: Ref<Resource[]>,
  enabled: Ref<boolean>
) {
  const clientService = useClientService()
  const fileRefs = ref<Map<string, string>>(new Map())
  const currentFolderRef = ref<string>('')
  const loading = ref(false)

  async function loadRefs() {
    if (!unref(enabled)) {
      fileRefs.value = new Map()
      currentFolderRef.value = ''
      return
    }

    const sp = unref(space)
    const items = unref(resources)
    if (!sp?.id || !items?.length) return

    loading.value = true
    const refs = new Map<string, string>()

    // Load in parallel, batch of 10
    const folders = items.filter((r) => r.type === 'folder' && !r.name.startsWith('_type_'))

    const batchSize = 10
    for (let i = 0; i < folders.length; i += batchSize) {
      const batch = folders.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (item) => {
          try {
            const response = await clientService.httpAuthenticated.get(
              `/graph/v1beta1/drives/${sp.id}/items/${item.id}/metadata`
            )
            const ref = response.data?.['oy.fileReference']
            if (ref) {
              refs.set(item.id, ref)
            }
          } catch {
            // skip
          }
        })
      )
    }

    fileRefs.value = refs
    loading.value = false
  }

  // Also load current folder's fileReference
  async function loadCurrentFolderRef(folderId: string) {
    if (!unref(enabled) || !folderId) {
      currentFolderRef.value = ''
      return
    }
    const sp = unref(space)
    if (!sp?.id) return
    try {
      const response = await clientService.httpAuthenticated.get(
        `/graph/v1beta1/drives/${sp.id}/items/${folderId}/metadata`
      )
      currentFolderRef.value = response.data?.['oy.fileReference'] || ''
    } catch {
      currentFolderRef.value = ''
    }
  }

  const getRef = (resourceId: string): string => {
    return unref(fileRefs).get(resourceId) || ''
  }

  watch([resources, enabled], () => loadRefs())

  return {
    fileRefs,
    currentFolderRef,
    loading,
    getRef,
    loadRefs,
    loadCurrentFolderRef
  }
}
