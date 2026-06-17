import { computed, ref, unref, watch, Ref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '@opencloud-eu/web-pkg'
import { TypedFolderSchema } from './types'

// Cache schemas per space to avoid re-fetching on every folder navigation
const schemaCache = new Map<string, Map<string, TypedFolderSchema | null>>()

export function useTypedFolderSchema(
  space: Ref<SpaceResource>,
  folderType: Ref<string | undefined>
) {
  const clientService = useClientService()
  const schema = ref<TypedFolderSchema | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isTyped = computed(() => !!unref(folderType))

  async function loadSchema() {
    const type = unref(folderType)
    const sp = unref(space)
    if (!type || !sp) {
      schema.value = null
      return
    }

    // Check cache
    const spaceId = sp.id
    if (!schemaCache.has(spaceId)) {
      schemaCache.set(spaceId, new Map())
    }
    const spaceSchemas = schemaCache.get(spaceId)!
    if (spaceSchemas.has(type)) {
      schema.value = spaceSchemas.get(type)!
      return
    }

    loading.value = true
    error.value = null
    try {
      const { getFileContents } = clientService.webdav
      const viewPath = `.space/views/${type}.json`
      const { body } = await getFileContents(sp, { path: viewPath })
      const parsed = JSON.parse(body as string) as TypedFolderSchema

      if (!parsed.label || !Array.isArray(parsed.children)) {
        error.value = `Invalid schema for type "${type}": missing label or children`
        schema.value = null
        spaceSchemas.set(type, null)
        return
      }

      schema.value = parsed
      spaceSchemas.set(type, parsed)
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.response?.status === 404) {
        // No schema for this type — not an error, just no typed view
        schema.value = null
        spaceSchemas.set(type, null)
      } else {
        error.value = `Failed to load schema for type "${type}": ${e.message || e}`
        schema.value = null
      }
    } finally {
      loading.value = false
    }
  }

  // Invalidate cache for a space (e.g. after schema edit)
  function invalidateCache(spaceId?: string) {
    if (spaceId) {
      schemaCache.delete(spaceId)
    } else {
      schemaCache.clear()
    }
  }

  watch([folderType, space], () => loadSchema(), { immediate: true })

  return {
    schema,
    isTyped,
    loading,
    error,
    invalidateCache
  }
}
