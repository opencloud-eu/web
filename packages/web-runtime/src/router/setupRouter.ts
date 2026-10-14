import { buildUrl, eventBus, useModals } from '@opencloud-eu/web-pkg'
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

    eventBus.publish('runtime.router.path-chaged.after')

    const event = new CustomEvent('pathchange', {
      detail: {
        to: { url: buildUrl(router, to.fullPath), name: to.name },
        from: { name: from.name, url: buildUrl(router, from.fullPath) }
      }
    })
    window.dispatchEvent(event)
  })
}
