import { RouteLocationRaw } from 'vue-router'
import { APPID } from '../appid'
import { App } from '../types'

export function getAppListRoute(tag?: string): RouteLocationRaw {
  return { name: `${APPID}-list`, ...(tag && { query: { q_tag: tag } }) }
}

export function getAppDetailsRoute(app: App): RouteLocationRaw {
  return { name: `${APPID}-details`, params: { appId: encodeURIComponent(app.id) } }
}
