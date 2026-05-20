import { h } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import ResourceEditorRouteHost from './ResourceEditorRouteHost.vue'
import type { AuthContext, WebRouteMeta } from '../../composables/router/types'
import type { ResourceEditorExtension } from '../../composables/piniaStores'

export interface ResourceEditorRouteOptions {
  extension: ResourceEditorExtension
  /** Defaults to `extension.appId`. */
  name?: string
  /** Defaults to `/:driveAliasAndItem(.*)?` — the path AppWrapperRoute has used historically. */
  path?: string
  /** Defaults to `'hybrid'`. */
  authContext?: AuthContext
  /** Merged on top of the defaults `{authContext, patchCleanPath: true}`. */
  meta?: WebRouteMeta
}

/**
 * Build a vue-router RouteRecord that mounts a ResourceEditorExtension via
 * the standalone route host. Sets the conventional defaults so apps don't
 * have to repeat them.
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
