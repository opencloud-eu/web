import { RouteRecordRaw } from 'vue-router'
import { AppNavigationItem } from '@opencloud-eu/web-pkg'

/** RuntimeApi defines the publicly available runtime api */
export interface RuntimeApi {
  announceRoutes: (routes: RouteRecordRaw[]) => void
  announceNavigationItems: (navigationItems: AppNavigationItem[]) => void
}
