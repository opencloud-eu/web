import { useModals } from '@opencloud-eu/web-pkg/src'
import { Router } from 'vue-router'

export const setupRouter = (router: Router) => {
  router.beforeEach(() => {
    const modalsStore = useModals()
    modalsStore.removeAllModals()
  })
}
