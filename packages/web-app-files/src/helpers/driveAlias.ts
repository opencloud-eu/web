// 'personal/home' is used as personal drive alias from static contexts
// (i.e. places where we can't load the actual personal space)
export const fakePersonalDriveAlias = 'personal/home'

export function isFakePersonalDriveAlias(driveAliasAndItem: string) {
  return (
    driveAliasAndItem === fakePersonalDriveAlias ||
    driveAliasAndItem.startsWith(`${fakePersonalDriveAlias}/`)
  )
}

// a personal drive alias that names its owner, e.g. 'personal/einstein/folder'
export function isOwnedPersonalDriveAlias(driveAliasAndItem: string) {
  return /^personal\/[^/]+/.test(driveAliasAndItem) && !isFakePersonalDriveAlias(driveAliasAndItem)
}
