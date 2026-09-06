import { basename, extname } from 'path'
import { urlJoin } from '../../utils'
import { DavPermission } from '../../webdav/constants'
import type { DriveItem } from '../../graph/generated'
import type { SpaceResource } from '../space'
import type { Resource } from './types'

// graphActionToDavPermission maps the actions a driveItem reports to the DAV
// permission letters the resource helpers built their can* checks on, so
// listings can move to graph without touching every consumer.
const graphActionToDavPermission: Record<string, string> = {
  'libre.graph/driveItem/permissions/create': DavPermission.Shareable,
  'libre.graph/driveItem/standard/delete': DavPermission.Deletable,
  'libre.graph/driveItem/path/update': DavPermission.Renameable + DavPermission.Moveable,
  'libre.graph/driveItem/children/create': DavPermission.FolderCreateable,
  'libre.graph/driveItem/upload/create': DavPermission.FileUpdateable,
  'libre.graph/driveItem/permissions/deny': DavPermission.Deny
}

export const davPermissionsFromActions = (actions: string[] = []): string => {
  const letters = actions.reduce((acc, action) => {
    const mapped = graphActionToDavPermission[action]
    if (!mapped) {
      return acc
    }
    for (const letter of mapped) {
      if (!acc.includes(letter)) {
        acc.push(letter)
      }
    }
    return acc
  }, [] as string[])

  // no read on the content means the item can be viewed but not downloaded
  if (!actions.includes('libre.graph/driveItem/content/read')) {
    letters.push(DavPermission.SecureView)
  }

  return letters.join('')
}

// buildResourceFromDriveItem turns a graph driveItem into the Resource shape the
// UI works with. The counterpart of buildResource, which reads a PROPFIND entry.
export const buildResourceFromDriveItem = (
  driveItem: DriveItem,
  space: SpaceResource,
  parentPath = '',
  // the drive root reports its own name, so callers that know the path pin it
  pathOverride?: string
): Resource => {
  const isFolder = !!driveItem.folder
  const name = driveItem.name || ''
  const path = pathOverride ?? urlJoin(parentPath, name, { leadingSlash: true })
  const actions = (driveItem as any)['@libre.graph.permissions.actions.allowedValues'] as string[]
  const shareTypes = ((driveItem as any)['@libre.graph.shareTypes'] || []) as string[]
  const lock = (driveItem as any).lockInfo
  const permissions = davPermissionsFromActions(actions)

  const r: any = {
    id: driveItem.id,
    fileId: driveItem.id,
    storageId: space.id,
    parentFolderId: driveItem.parentReference?.id,
    mimeType: driveItem.file?.mimeType,
    name,
    extension: isFolder ? '' : extname(name).replace(/^\./, ''),
    path,
    webDavPath: urlJoin(space.webDavPath, path),
    type: isFolder ? 'folder' : 'file',
    isFolder,
    locked: !!lock,
    lockOwner: lock?.owners?.[0]?.displayName,
    lockTime: lock?.createdDateTime,
    processing: !!(driveItem as any).pendingOperations?.pendingContentUpdate,
    mdate: driveItem.lastModifiedDateTime,
    size: (driveItem.size ?? 0).toString(),
    permissions,
    isInVault: false,
    starred: (driveItem as any)['@libre.graph.me.following'] === true,
    etag: driveItem.eTag,
    shareTypes,
    privateLink: driveItem.webUrl,
    remoteItemId: (driveItem as any).remoteItem?.id,
    remoteItemPath: (driveItem as any).remoteItem?.path,
    // the item owner is always the space owner, see node.Owner() in reva
    owner: (space as any).owner?.user || (space as any).owner,
    tags: ((driveItem as any)['@libre.graph.tags'] || []) as string[],
    audio: driveItem.audio,
    location: driveItem.location,
    image: driveItem.image,
    photo: driveItem.photo,
    video: (driveItem as any).video,
    livePhoto: (driveItem as any)['@libre.graph.livePhoto'],
    extraProps: {},
    hasPreview: () => !!driveItem.thumbnails?.length || !isFolder,
    canUpload: function (this: Resource) {
      return this.permissions.indexOf(DavPermission.FolderCreateable) >= 0
    },
    canDownload: function () {
      return this.permissions.indexOf(DavPermission.SecureView) === -1
    },
    canBeDeleted: function () {
      return this.permissions.indexOf(DavPermission.Deletable) >= 0
    },
    canRename: function () {
      return this.permissions.indexOf(DavPermission.Renameable) >= 0
    },
    canShare: function ({ ability }: { ability: any }) {
      return (
        ability.can('create-all', 'Share') && this.permissions.indexOf(DavPermission.Shareable) >= 0
      )
    },
    canCreate: function () {
      return this.permissions.indexOf(DavPermission.FolderCreateable) >= 0
    },
    canEditTags: function () {
      return (
        this.permissions.indexOf(DavPermission.Updateable) >= 0 ||
        this.permissions.indexOf(DavPermission.FileUpdateable) >= 0 ||
        this.permissions.indexOf(DavPermission.FolderCreateable) >= 0
      )
    },
    canListVersions: function () {
      return !this.isFolder
    },
    isMounted: function () {
      return this.permissions.indexOf(DavPermission.Mounted) >= 0
    },
    isReceivedShare: function () {
      return this.permissions.indexOf(DavPermission.Shared) >= 0
    },
    isShareRoot(): boolean {
      return !!(driveItem as any).remoteItem
    },
    getDomSelector: () => (driveItem.id || '').replace(/[^A-Za-z0-9\-_]/g, '')
  }

  return r as Resource
}

export const buildResourcesFromDriveItems = (
  driveItems: DriveItem[],
  space: SpaceResource,
  parentPath = ''
): Resource[] => driveItems.map((item) => buildResourceFromDriveItem(item, space, parentPath))

export { basename }
