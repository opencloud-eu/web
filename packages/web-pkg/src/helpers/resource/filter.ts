import Fuse from 'fuse.js'
import { defaultFuseOptions, escapeFuseQuery } from '../fuse'
import { Resource } from '@opencloud-eu/web-client'

export const filterResources = <T extends Resource>(
  resources: T[],
  term: string,
  limit?: number
): T[] => {
  const engine = new Fuse(resources, {
    ...defaultFuseOptions,
    keys: ['name', 'type', 'icon', 'extension', 'tags']
  })

  return engine.search(escapeFuseQuery(term), { limit }).map((result) => result.item)
}
