import LayoutBare from '../../layouts/Bare.vue'
import LayoutPlain from '../../layouts/Plain.vue'
import LayoutApplication from '../../layouts/Application.vue'
import { computed, unref } from 'vue'
import { Router } from 'vue-router'
import { useRouter, AuthStore } from '@opencloud-eu/web-pkg'

export interface LayoutOptions {
  authStore?: AuthStore
  router?: Router
}

export const useLayout = (options?: LayoutOptions) => {
  const router = options?.router || useRouter()

  const layoutType = computed<'bare' | 'plain' | 'application'>(() => {
    const bareLayoutRoutes = ['login', 'oidcCallback']
    const plainLayoutRoutes = ['logout', 'resolvePublicLink', 'accessDenied']

    const routeName = unref(router.currentRoute).name as string
    if (!routeName || bareLayoutRoutes.includes(routeName)) {
      return 'bare'
    }
    if (plainLayoutRoutes.includes(routeName)) {
      return 'plain'
    }

    return 'application'
  })

  const layout = computed(() => {
    switch (unref(layoutType)) {
      case 'application':
        return LayoutApplication
      case 'plain':
        return LayoutPlain
      case 'bare':
      default:
        return LayoutBare
    }
  })

  return {
    layoutType,
    layout
  }
}
