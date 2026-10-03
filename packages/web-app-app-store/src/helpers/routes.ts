import { RouteLocationRaw } from 'vue-router'
import { APPID } from '../appid'
import { App } from '../types'

export function getAppListRoute(filter?: string): RouteLocationRaw {
  return { name: `${APPID}-list`, ...(filter && { query: { filter } }) }
}

export function getAppDetailsRoute(app: App): RouteLocationRaw {
  return { name: `${APPID}-details`, params: { appId: encodeURIComponent(app.id) } }
}
