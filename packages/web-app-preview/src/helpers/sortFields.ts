import {
  filesSortFields,
  locationGuestShares,
  locationSharesViaLink,
  locationSharesWithMe,
  locationSharesWithOthers,
  sharesSortFields,
  SortFieldsPreset
} from '@opencloud-eu/web-pkg'

const sharesRouteNames = [
  locationSharesWithMe.name,
  locationSharesWithOthers.name,
  locationSharesViaLink.name,
  locationGuestShares.name
]

/**
 * The preset of the list a file gets opened from, to keep the order of that list in the preview.
 * Lists without openable files (trash bins, spaces) aren't covered.
 */
export function getSortFieldsPreset(routeName: string): SortFieldsPreset {
  if (sharesRouteNames.includes(routeName)) {
    return sharesSortFields
  }
  return filesSortFields
}
