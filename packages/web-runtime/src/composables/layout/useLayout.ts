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

  /**
   * Determines the layout type based on the current route.
   *
   *  - bare: most minimal layout for pages that don't require any styling at all,
   *    typically used for login and authentication pages, showing a loading spinner.
   *  - plain: a simple layout with the OpenCloud logo and a card in the middle,
   *    typically used for pages like access denied or public link password forms.
   *  - application: the full application layout for the main content of the app.
   */
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
