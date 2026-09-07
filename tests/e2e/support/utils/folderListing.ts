import { Response } from '@playwright/test'

/**
 * Matches the response that carries a folder listing, whichever API served it:
 * a PROPFIND for the places still on webdav (public links, trash bin) and a
 * driveItem stat with expanded children for spaces and shares.
 */
export const isFolderListingResponse = (resp: Response): boolean => {
  if (resp.request().method() === 'PROPFIND') {
    return resp.status() === 207
  }

  return (
    resp.request().method() === 'GET' &&
    resp.status() === 200 &&
    /\/graph\/v1\.0\/drives\/[^/]+\/(items|root)/.test(resp.url()) &&
    resp.url().includes('expand=children')
  )
}
