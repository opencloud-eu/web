import { App } from '../types'

export function getAuthorNames(app: App) {
  return (app.authors || [])
    .map((author) => author.name)
    .filter(Boolean)
    .join(', ')
}
