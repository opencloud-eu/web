import { SpaceResource } from '@opencloud-eu/web-client'
import {
  getSpaceByDriveAliasAndItem,
  getSpaceForDriveAliasAndItem
} from '../../../../src/helpers/spaces/driveAlias'

const space = (driveAlias: string, id: string): SpaceResource =>
  ({ id, fileId: id, driveAlias }) as SpaceResource

describe('getSpaceByDriveAliasAndItem', () => {
  it('matches a drive alias with and without an item path', () => {
    const personal = space('personal/admin', 'space-1')

    expect(getSpaceByDriveAliasAndItem([personal], 'personal/admin')).toBe(personal)
    expect(getSpaceByDriveAliasAndItem([personal], 'personal/admin/folder/file.txt')).toBe(personal)
  })

  it('only matches on full segments', () => {
    const personal = space('personal/admin', 'space-1')

    expect(getSpaceByDriveAliasAndItem([personal], 'personal/admin-other/x')).toBeUndefined()
    expect(getSpaceByDriveAliasAndItem([personal], 'personal')).toBeUndefined()
  })

  it('ignores spaces without a drive alias', () => {
    expect(
      getSpaceByDriveAliasAndItem([{ id: 'x' } as SpaceResource], 'project/test')
    ).toBeUndefined()
  })
})

describe('getSpaceForDriveAliasAndItem', () => {
  const first = space('project/test', 'space-a')
  const second = space('project/test', 'space-b')

  it('tells same-named spaces apart by the fileId of the space itself', () => {
    expect(getSpaceForDriveAliasAndItem([first, second], 'project/test', 'space-b')).toBe(second)
  })

  it('tells same-named spaces apart by the fileId of an item inside them', () => {
    expect(
      getSpaceForDriveAliasAndItem([first, second], 'project/test/sub', 'space-b!item-1')
    ).toBe(second)
  })

  it('falls back to the drive alias without a fileId', () => {
    expect(getSpaceForDriveAliasAndItem([first, second], 'project/test')).toBe(first)
  })

  it('falls back to the drive alias when the fileId belongs to no known space', () => {
    expect(getSpaceForDriveAliasAndItem([first, second], 'project/test', 'space-z')).toBe(first)
  })

  it('returns undefined when no space matches', () => {
    expect(getSpaceForDriveAliasAndItem([first], 'project/other', 'space-z')).toBeUndefined()
  })
})
