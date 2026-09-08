import {
  davPermissionsFromActions,
  buildResourceFromDriveItem
} from '../../../../src/helpers/resource/graph'
import { ShareTypes } from '../../../../src/helpers/share'
import type { SpaceResource } from '../../../../src/helpers/space'

// a manager's action list, taken verbatim from a running server
const managerActions = [
  'libre.graph/driveItem/permissions/create',
  'libre.graph/driveItem/children/create',
  'libre.graph/driveItem/standard/delete',
  'libre.graph/driveItem/path/read',
  'libre.graph/driveItem/quota/read',
  'libre.graph/driveItem/content/read',
  'libre.graph/driveItem/upload/create',
  'libre.graph/driveItem/permissions/read',
  'libre.graph/driveItem/children/read',
  'libre.graph/driveItem/versions/read',
  'libre.graph/driveItem/deleted/read',
  'libre.graph/driveItem/path/update',
  'libre.graph/driveItem/permissions/delete'
]

const space = {
  id: 'storage$space',
  webDavPath: '/dav/spaces/storage$space',
  owner: { id: 'alice', displayName: 'Alice' }
} as unknown as SpaceResource

describe('davPermissionsFromActions', () => {
  it('maps a manager to the full dav permission set', () => {
    const permissions = davPermissionsFromActions(managerActions)
    expect(permissions).toContain('R') // shareable
    expect(permissions).toContain('D') // deletable
    expect(permissions).toContain('N') // renameable
    expect(permissions).toContain('CK') // folder createable
    expect(permissions).not.toContain('X') // content is readable, so no secure view
  })

  it('marks an item without content read as secure view', () => {
    const permissions = davPermissionsFromActions(['libre.graph/driveItem/children/read'])
    expect(permissions).toContain('X')
  })

  it('handles an empty action list', () => {
    expect(davPermissionsFromActions([])).toBe('X')
    expect(davPermissionsFromActions(undefined)).toBe('X')
  })
})

describe('buildResourceFromDriveItem', () => {
  it('builds a folder resource with working capability checks', () => {
    const r = buildResourceFromDriveItem(
      {
        id: 'storage$space!folder',
        name: 'music',
        size: 0,
        eTag: '"abc"',
        folder: {},
        lastModifiedDateTime: '2026-09-01T12:00:00Z',
        parentReference: { id: 'storage$space!root' },
        '@libre.graph.permissions.actions.allowedValues': managerActions
      } as any,
      space
    )

    expect(r.isFolder).toBe(true)
    expect(r.name).toBe('music')
    expect(r.path).toBe('/music')
    expect(r.canUpload({})).toBe(true)
    expect(r.canBeDeleted()).toBe(true)
    expect(r.canRename()).toBe(true)
    expect(r.canDownload()).toBe(true)
    expect(r.storageId).toBe('storage$space')
    expect(r.owner).toEqual({ id: 'alice', displayName: 'Alice' })
  })

  it('treats a drive root as a folder, it carries neither facet', () => {
    const r = buildResourceFromDriveItem(
      {
        id: 'storage$space!space',
        name: '.',
        size: 4897,
        root: {},
        parentReference: { id: 'storage$space', path: '.' },
        '@libre.graph.permissions.actions.allowedValues': managerActions
      } as any,
      space,
      '',
      '/'
    )

    expect(r.isFolder).toBe(true)
    expect(r.type).toBe('folder')
    expect(r.path).toBe('/')
  })

  it('carries the facets and the lock through', () => {
    const r = buildResourceFromDriveItem(
      {
        id: 'storage$space!song',
        name: 'fight.mp3',
        size: 42,
        file: { mimeType: 'audio/mpeg' },
        audio: { artist: 'Motörhead', title: 'Fight' },
        lockInfo: { lockType: 'exclusive', owners: [{ displayName: 'Alice' }] },
        pendingOperations: { pendingContentUpdate: {} },
        '@libre.graph.shareTypes': ['user', 'link'],
        '@libre.graph.permissions.actions.allowedValues': managerActions
      } as any,
      space,
      '/music'
    )

    expect(r.isFolder).toBe(false)
    expect(r.extension).toBe('mp3')
    expect(r.path).toBe('/music/fight.mp3')
    expect(r.mimeType).toBe('audio/mpeg')
    expect((r as any).audio.artist).toBe('Motörhead')
    expect(r.locked).toBe(true)
    expect(r.lockOwner).toBe('Alice')
    expect(r.processing).toBe(true)
    // graph reports keys, consumers compare against the numeric share types
    expect(r.shareTypes).toEqual([ShareTypes.user.value, ShareTypes.link.value])
  })

  it('has a preview exactly when the server expanded thumbnails for it', () => {
    const withThumbnail = buildResourceFromDriveItem(
      {
        id: 'x',
        name: 'bild.jpg',
        file: { mimeType: 'image/jpeg' },
        thumbnails: [{ small: { url: 'https://cloud.test/preview' } }]
      } as any,
      space
    )
    const withoutThumbnail = buildResourceFromDriveItem(
      { id: 'y', name: 'notes.json', file: { mimeType: 'application/json' } } as any,
      space
    )

    expect(withThumbnail.hasPreview()).toBe(true)
    expect(withoutThumbnail.hasPreview()).toBe(false)
  })

  it('reports a shared item as a share root', () => {
    const r = buildResourceFromDriveItem(
      {
        id: 'x',
        name: 'shared.txt',
        remoteItem: { id: 'other$drive!item', path: '/Project X' }
      } as any,
      space
    )
    expect(r.isShareRoot()).toBe(true)
    expect(r.remoteItemPath).toBe('/Project X')
  })
})
