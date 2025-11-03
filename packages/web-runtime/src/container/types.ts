import { RouteRecordRaw } from 'vue-router'
import { App, Component } from 'vue'
import { AppNavigationItem } from '@opencloud-eu/web-pkg'

/** RuntimeApi defines the publicly available runtime api */
export interface RuntimeApi {
  announceRoutes: (routes: RouteRecordRaw[]) => void
  announceNavigationItems: (navigationItems: AppNavigationItem[]) => void
  openPortal: (
    instance: App,
    toApp: string,
    toPortal: string,
    order: number,
    components: Component[]
  ) => void
}
