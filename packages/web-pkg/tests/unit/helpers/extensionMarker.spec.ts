import { SpaceResource } from '@opencloud-eu/web-client'
import {
  ExtensionMarker,
  findExtensionRoot,
  findExtensionRootInPath,
  isContentTypeSpace
} from '../../../src/helpers/extensionMarker'

const CONTENT_TYPE = 'application/vnd.opencloud.vault'
const marker: ExtensionMarker = { extension: 'vault', contentType: CONTENT_TYPE }

const shareSpace = (name: string) =>
  ({ id: 's1', driveType: 'share', name }) as unknown as SpaceResource
const personalSpace = { id: 'p1', driveType: 'personal', name: 'Admin' } as unknown as SpaceResource
const projectSpace = (contentType?: string) =>
  ({ id: 'pr1', driveType: 'project', name: 'Team', contentType }) as unknown as SpaceResource

describe('isContentTypeSpace', () => {
  it('detects the marker on the drive property', () => {
    expect(isContentTypeSpace(projectSpace(CONTENT_TYPE), CONTENT_TYPE)).toBe(true)
  })

  it('does not take one marker for another', () => {
    expect(isContentTypeSpace(projectSpace('application/vnd.opencloud.ocnb'), CONTENT_TYPE)).toBe(
      false
    )
  })

  it('handles an unmarked or missing space', () => {
    expect(isContentTypeSpace(projectSpace(), CONTENT_TYPE)).toBe(false)
    expect(isContentTypeSpace(undefined, CONTENT_TYPE)).toBe(false)
  })
})

describe('findExtensionRootInPath', () => {
  it('returns the first marked segment as an absolute path', () => {
    expect(findExtensionRootInPath('/folder/my.vault/sub/file.txt', 'vault')).toBe(
      '/folder/my.vault'
    )
  })

  it('returns the marked segment itself', () => {
    expect(findExtensionRootInPath('/my.vault', 'vault')).toBe('/my.vault')
  })

  it('returns null when no segment carries the marker', () => {
    expect(findExtensionRootInPath('/folder/sub', 'vault')).toBeNull()
    expect(findExtensionRootInPath('/', 'vault')).toBeNull()
    expect(findExtensionRootInPath(undefined, 'vault')).toBeNull()
  })
})

describe('findExtensionRoot', () => {
  it('takes the marked segment in the path of an unmarked space', () => {
    expect(findExtensionRoot(personalSpace, '/my.vault/sub', marker)).toBe('/my.vault')
  })

  it('roots a marked space at "/"', () => {
    expect(findExtensionRoot(projectSpace(CONTENT_TYPE), '/sub/file.txt', marker)).toBe('/')
  })

  it('roots a share space whose name carries the marker at "/"', () => {
    expect(findExtensionRoot(shareSpace('my.vault'), '/', marker)).toBe('/')
  })

  it('ignores a marked segment inside a marked space', () => {
    expect(findExtensionRoot(projectSpace(CONTENT_TYPE), '/x.vault/file.txt', marker)).toBe('/')
    expect(findExtensionRoot(projectSpace(CONTENT_TYPE), '/x.vault', marker)).toBe('/')
    expect(findExtensionRoot(shareSpace('my.vault'), '/x.vault/file.txt', marker)).toBe('/')
  })

  it('ignores the marker in the name of a non-share space', () => {
    expect(findExtensionRoot(shareSpace('documents'), '/', marker)).toBeNull()
    expect(findExtensionRoot(projectSpace(), '/', marker)).toBeNull()
  })
})
