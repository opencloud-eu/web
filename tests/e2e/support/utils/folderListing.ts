import { Response } from '@playwright/test'

/**
 * Matches the response that carries a resource, whichever API served it: a
 * PROPFIND for what is still on webdav (the trash bin) and a driveItem stat
 * for everything that moved to graph.
 */
export const isResourceStatResponse = (resp: Response): boolean => {
  if (resp.request().method() === 'PROPFIND') {
    return resp.status() === 207
  }

  return (
    resp.request().method() === 'GET' &&
    resp.status() === 200 &&
    /\/graph\/v1\.0\/drives\/[^/]+\/(items|root)/.test(resp.url())
  )
}

/**
 * A stat that carries the folder's children, so a listing rather than a single
 * resource.
 */
export const isFolderListingResponse = (resp: Response): boolean =>
  isResourceStatResponse(resp) &&
  (resp.request().method() === 'PROPFIND' || resp.url().includes('expand=children'))
