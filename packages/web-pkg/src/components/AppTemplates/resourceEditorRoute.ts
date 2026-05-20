import { h } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import ResourceEditorRouteHost from './ResourceEditorRouteHost.vue'
import type { AuthContext, WebRouteMeta } from '../../composables/router/types'
import type { ResourceEditorExtension } from '../../composables/piniaStores'

export interface ResourceEditorRouteOptions {
  extension: ResourceEditorExtension
  name?: string
  path?: string
  authContext?: AuthContext
  meta?: WebRouteMeta
}

/**
 * Builds a vue-router RouteRecord that mounts a ResourceEditorExtension via
 * `ResourceEditorRouteHost`. Defaults: `name = extension.appId`,
 * `path = '/:driveAliasAndItem(.*)?'`, `authContext = 'hybrid'`,
 * `meta.patchCleanPath = true`.
 */
export function resourceEditorRoute(opts: ResourceEditorRouteOptions): RouteRecordRaw {
  const { extension, name, path, authContext, meta } = opts
  return {
    name: name ?? extension.appId,
    path: path ?? '/:driveAliasAndItem(.*)?',
    component: {
      name: `ResourceEditorRoute(${extension.appId})`,
      render: () => h(ResourceEditorRouteHost, { extension })
    },
    meta: {
      authContext: authContext ?? 'hybrid',
      patchCleanPath: true,
      ...meta
    }
  }
}
