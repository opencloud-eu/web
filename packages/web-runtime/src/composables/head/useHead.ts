import { computed, unref } from 'vue'
import { useHead as _useHead } from '@vueuse/head'
import { getBackendVersion, getWebVersion } from '../../container/versions'
import { useCapabilityStore, useThemeStore } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'

export const useHead = () => {
  const themeStore = useThemeStore()
  const capabilityStore = useCapabilityStore()
  const { currentTheme } = storeToRefs(themeStore)

  const favicon = computed(() => unref(currentTheme).favicon)

  _useHead(
    computed(() => {
      return {
        meta: [
          {
            name: 'generator',
            content: [getWebVersion(), getBackendVersion({ capabilityStore })]
              .filter(Boolean)
              .join(', ')
          }
        ],
        ...(unref(favicon) && { link: [{ rel: 'icon', href: unref(favicon) }] })
      }
    })
  )
}
