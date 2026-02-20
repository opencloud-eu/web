import { computed } from 'vue'
import { useHead as _useHead } from '@vueuse/head'
import { getBackendVersion, getWebVersion, useCapabilityStore } from '@opencloud-eu/web-pkg'

export const useHead = () => {
  const capabilityStore = useCapabilityStore()

  _useHead({
    meta: computed(() => [
      {
        name: 'generator',
        content: [getWebVersion(), getBackendVersion({ capabilityStore })]
          .filter(Boolean)
          .join(', ')
      }
    ])
  })
}
