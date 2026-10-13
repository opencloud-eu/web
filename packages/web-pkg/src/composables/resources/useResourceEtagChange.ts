import { watch } from 'vue'
import { Resource } from '@opencloud-eu/web-client'

/**
 * Calls the callback for every resource whose etag changed, e.g. to load its preview again.
 * Rows and tiles stay mounted on purpose, so an open context menu doesn't close.
 */
export const useResourceEtagChange = (
  resources: () => Resource[],
  callback: (resource: Resource) => void
) => {
  let etags = new Map<string, string>()

  watch(
    () => resources().map(({ id, etag }) => `${id}:${etag}`),
    () => {
      const current = new Map<string, string>()
      for (const resource of resources()) {
        const previousEtag = etags.get(resource.id)
        if (previousEtag !== undefined && previousEtag !== resource.etag) {
          callback(resource)
        }
        current.set(resource.id, resource.etag)
      }
      etags = current
    },
    { immediate: true }
  )
}
