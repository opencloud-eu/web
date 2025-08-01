import { useModals } from '@opencloud-eu/web-pkg/src'
import { Router } from 'vue-router'

export const setupRouterHooks = (router: Router) => {
  // Automatically close all open modals before each route change
  router.beforeEach(() => {
    const modalsStore = useModals()
    modalsStore.removeAllModals()
  })

  // Dispatch a "pathchange" event after navigation for external integrations to react to
  router.afterEach((to, from) => {
    if (to.path === from.path) {
      return
    }

    const event = new CustomEvent('pathchange', {
      detail: {
        to: { url: new URL(to.fullPath, window.location.origin).href, name: to.name },
        from: { name: from.name, url: new URL(from.fullPath, window.location.origin).href }
      }
    })
    window.dispatchEvent(event)
  })
}
