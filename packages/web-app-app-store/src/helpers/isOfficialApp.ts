import { App } from '../types'

export function isOfficialApp(app: App) {
  return (app.authors || []).some((author) => author.name?.toLowerCase().includes('opencloud'))
}
