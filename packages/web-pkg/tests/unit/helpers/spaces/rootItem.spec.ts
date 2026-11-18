import { mock } from 'vitest-mock-extended'
import { SpaceResource } from '@opencloud-eu/web-client'
import { getProjectSpaceOfRootItem } from '../../../../src/helpers/spaces'

describe('getProjectSpaceOfRootItem', () => {
  const projectSpace = mock<SpaceResource>({ id: 'storage$space', driveType: 'project' })
  const personalSpace = mock<SpaceResource>({ id: 'storage$personal', driveType: 'personal' })
  const spaces = [projectSpace, personalSpace]

  it('returns the project space for its root item', () => {
    expect(getProjectSpaceOfRootItem(spaces, 'storage$space')).toBe(projectSpace)
  })
  it('returns nothing for an item inside a project space', () => {
    expect(getProjectSpaceOfRootItem(spaces, 'storage$space!space')).toBeUndefined()
  })
  it('returns nothing for the root item of a non-project space', () => {
    expect(getProjectSpaceOfRootItem(spaces, 'storage$personal')).toBeUndefined()
  })
})
