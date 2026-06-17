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
    console.log('[TypedFolder] loadSchema called', { type, spaceId: sp?.id })
    if (!type || !sp?.id) {
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
      console.log('[TypedFolder] cache hit for', type)
      schema.value = spaceSchemas.get(type)!
      return
    }

    loading.value = true
    error.value = null
    try {
      const { getFileContents } = clientService.webdav
      const viewPath = `.space/views/${type}.json`
      console.log('[TypedFolder] loading schema from', viewPath)
      const { body } = await getFileContents(sp, { path: viewPath })
      console.log('[TypedFolder] schema loaded, length:', (body as string)?.length)
      const parsed = JSON.parse(body as string) as TypedFolderSchema

      if (!parsed.label) {
        console.warn('[TypedFolder] schema missing label for', type)
        schema.value = null
        spaceSchemas.set(type, null)
        return
      }

      console.log('[TypedFolder] schema OK:', parsed.label, 'children:', parsed.children)
      schema.value = parsed
      spaceSchemas.set(type, parsed)
    } catch (e) {
      console.warn('[TypedFolder] schema load failed for', type, e)
      schema.value = null
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

  watch([folderType, space], () => loadSchema())

  return {
    schema,
    isTyped,
    loading,
    error,
    invalidateCache
  }
}
