import { computed, ref, unref, watch, Ref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '@opencloud-eu/web-pkg'

export interface SpecialViewConfig {
  type: string
  [key: string]: unknown
}

export interface SpecialFolderState {
  /** .special/ directory detected in resource list */
  hasSpecialDir: Ref<boolean>
  /** Parsed view.json config, null if not loaded or error */
  viewConfig: Ref<SpecialViewConfig | null>
  /** Error message if .special/ present but view.json missing/broken */
  errorMessage: Ref<string | null>
  /** True while fetching view.json */
  isLoading: Ref<boolean>
}

export const useSpecialFolderView = (
  space: Ref<SpaceResource>,
  resources: Ref<Resource[]>
): SpecialFolderState => {
  const clientService = useClientService()
  const { getFileContents } = clientService.webdav

  const viewConfig = ref<SpecialViewConfig | null>(null)
  const errorMessage = ref<string | null>(null)
  const isLoading = ref(false)

  const hasSpecialDir = computed(() => {
    return unref(resources).some(
      (r) => r.isFolder && r.name === '.special'
    )
  })

  const specialDir = computed(() => {
    return unref(resources).find(
      (r) => r.isFolder && r.name === '.special'
    )
  })

  watch(
    hasSpecialDir,
    async (detected) => {
      viewConfig.value = null
      errorMessage.value = null

      if (!detected) {
        return
      }

      isLoading.value = true
      try {
        const dir = unref(specialDir)
        const viewJsonPath = dir.path.replace(/\/?$/, '/view.json')

        const { body } = await getFileContents(unref(space), {
          path: viewJsonPath
        })

        const parsed = JSON.parse(body as string)
        if (!parsed.type || typeof parsed.type !== 'string') {
          errorMessage.value = '.special/view.json: "type" field missing or invalid'
          return
        }

        viewConfig.value = parsed
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.response?.status === 404) {
          errorMessage.value = '.special/view.json not found'
        } else if (e instanceof SyntaxError) {
          errorMessage.value = '.special/view.json: invalid JSON'
        } else {
          errorMessage.value = `.special/view.json: ${e.message || 'unknown error'}`
        }
      } finally {
        isLoading.value = false
      }
    },
    { immediate: true }
  )

  return {
    hasSpecialDir,
    viewConfig,
    errorMessage,
    isLoading
  }
}
