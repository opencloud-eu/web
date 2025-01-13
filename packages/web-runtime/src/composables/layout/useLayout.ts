import LayoutPlain from '../../layouts/Plain.vue'
import LayoutApplication from '../../layouts/Application.vue'
import { computed, unref } from 'vue'
import { Router } from 'vue-router'
import { useRouter, AuthStore } from '@opencloud-eu/web-pkg'

export interface LayoutOptions {
  authStore?: AuthStore
  router?: Router
}

const layoutTypes = ['plain', 'application'] as const
type LayoutType = (typeof layoutTypes)[number]

export const useLayout = (options?: LayoutOptions) => {
  const router = options?.router || useRouter()

  const layoutType = computed<LayoutType>(() => {
    const plainLayoutRoutes = [
      'login',
      'logout',
      'oidcCallback',
      'oidcSilentRedirect',
      'resolvePublicLink',
      'accessDenied'
    ]
    if (
      !unref(router.currentRoute).name ||
      plainLayoutRoutes.includes(unref(router.currentRoute).name as string)
    ) {
      return 'plain'
    }

    return 'application'
  })

  const layout = computed(() => {
    switch (unref(layoutType)) {
      case 'application':
        return LayoutApplication
      case 'plain':
      default:
        return LayoutPlain
    }
  })

  return {
    layoutType,
    layout
  }
}
