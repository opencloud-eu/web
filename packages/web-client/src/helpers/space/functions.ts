import { User } from '../../graph/generated'
import {
  Ability,
  extractDomSelector,
  extractExtensionFromFile,
  extractNodeId,
  Resource
} from '../resource'
import {
  isPersonalSpaceResource,
  PublicSpaceResource,
  ShareSpaceResource,
  SpaceResource
} from './types'

import { DavProperty } from '../../webdav/constants'
import { buildWebDavPublicPath, buildWebDavOcmPath } from '../publicLink'
import { urlJoin } from '../../utils'
import { Drive, DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { CollaboratorShare, GraphSharePermission, ShareRole } from '../share'

export function buildWebDavSpacesPath(storageId: string, path?: string) {
  return urlJoin('spaces', storageId, path, {
    leadingSlash: true
  })
}

export function buildWebDavSpacesTrashPath(storageId: string, path = '') {
  return urlJoin('spaces', 'trash-bin', storageId, path, {
    leadingSlash: true
  })
}

export function getRelativeSpecialFolderSpacePath(space: SpaceResource, type: 'image' | 'readme') {
  const typeMap = { image: 'spaceImageData', readme: 'spaceReadmeData' } as const
  const specialProp = space[typeMap[type]]
  if (!specialProp) {
    return ''
  }
  const webDavPathComponents = decodeURI(specialProp.webDavUrl).split('/')
  const idComponent = webDavPathComponents.find((c) => c.startsWith(space.id))
  if (!idComponent) {
    return ''
  }
  return webDavPathComponents.slice(webDavPathComponents.indexOf(idComponent) + 1).join('/')
}

export function isManager(share: CollaboratorShare) {
  // delete permissions implies that the user/group is a manager
  return share.permissions.includes(GraphSharePermission.deletePermissions)
}

export const getSpaceManagers = (space: SpaceResource, graphRoles: Record<string, ShareRole>) => {
  return space.root.permissions?.filter((p) => {
    let permissionActions: string[] = []
    if (p['@libre.graph.permissions.actions']) {
      permissionActions = p['@libre.graph.permissions.actions']
    }
    const role = graphRoles[p.roles?.[0]]
    if (role && !permissionActions.length) {
      const permissions = role.rolePermissions.find(
        ({ condition }) => condition === 'exists @Resource.Root'
      )
      permissionActions = permissions?.allowedResourceActions || []
    }

    return permissionActions.includes(GraphSharePermission.deletePermissions)
  })
}

export type PublicLinkType = 'ocm' | 'public-link'
export function buildPublicSpaceResource(
  data: any & { publicLinkType: PublicLinkType }
): PublicSpaceResource {
  const publicLinkPassword = data.publicLinkPassword

  const fileId = data.props?.[DavProperty.FileId]
  const publicLinkItemType = data.props?.[DavProperty.PublicLinkItemType]
  const publicLinkPermission = data.props?.[DavProperty.PublicLinkPermission]
  const publicLinkExpiration = data.props?.[DavProperty.PublicLinkExpiration]
  const publicLinkShareDate = data.props?.[DavProperty.PublicLinkShareDate]
  const publicLinkShareOwner = data.props?.[DavProperty.PublicLinkShareOwner]
  const publicLinkType = data.publicLinkType

  let driveAlias
  let webDavPath
  if (publicLinkType === 'ocm') {
    driveAlias = `ocm/${data.id}`
    webDavPath = buildWebDavOcmPath(data.id)
  } else {
    driveAlias = `public/${data.id}`
    webDavPath = buildWebDavPublicPath(data.id)
  }

  return Object.assign(
    buildSpace({
      ...data,
      driveType: 'public',
      driveAlias,
      webDavPath
    }),
    {
      ...(fileId && { fileId }),
      ...(publicLinkPassword && { publicLinkPassword }),
      ...(publicLinkItemType && { publicLinkItemType }),
      ...(publicLinkPermission && { publicLinkPermission: parseInt(publicLinkPermission) }),
      ...(publicLinkExpiration && { publicLinkExpiration }),
      ...(publicLinkShareDate && { publicLinkShareDate }),
      ...(publicLinkShareOwner && { publicLinkShareOwner }),
      publicLinkType
    }
  )
}

export function buildShareSpaceResource({
  driveAliasPrefix,
  id,
  shareName,
  serverUrl
}: {
  driveAliasPrefix: 'share' | 'ocm-share'
  id: string
  shareName: string
  serverUrl: string
}): ShareSpaceResource {
  const space = buildSpace({
    id,
    driveAlias: `${driveAliasPrefix}/${shareName}`,
    driveType: 'share',
    name: shareName,
    serverUrl
  }) as ShareSpaceResource
  space.rename = (newName: string) => {
    space.driveAlias = `${driveAliasPrefix}/${newName}`
    space.name = newName
  }
  return space
}

export function buildSpace(
  data: Drive & {
    path?: string
    serverUrl?: string
    webDavPath?: string
    webDavTrashPath?: string
  }
): SpaceResource {
  let spaceImageData: DriveItem, spaceReadmeData: DriveItem
  if (data.special) {
    spaceImageData = data.special.find((el) => el.specialFolder.name === 'image')
    spaceReadmeData = data.special.find((el) => el.specialFolder.name === 'readme')

    if (spaceImageData) {
      spaceImageData.webDavUrl = decodeURI(spaceImageData.webDavUrl)
    }

    if (spaceReadmeData) {
      spaceReadmeData.webDavUrl = decodeURI(spaceReadmeData.webDavUrl)
    }
  }

  const disabled = data.root?.deleted?.state === 'trashed'
  const webDavPath = urlJoin(data.webDavPath || buildWebDavSpacesPath(data.id), {
    leadingSlash: true
  })
  const webDavUrl = urlJoin(data.serverUrl, 'remote.php/dav', webDavPath)
  const webDavTrashPath = urlJoin(data.webDavTrashPath || buildWebDavSpacesTrashPath(data.id), {
    leadingSlash: true
  })
  const webDavTrashUrl = urlJoin(data.serverUrl, 'remote.php/dav', webDavTrashPath)

  const s = {
    id: data.id,
    fileId: data.id,
    storageId: data.id,
    mimeType: '',
    name: data.name,
    description: data.description,
    extension: '',
    path: '/',
    webDavPath,
    webDavTrashPath,
    driveAlias: data.driveAlias,
    driveType: data.driveType,
    type: 'space',
    isFolder: true,
    mdate: data.lastModifiedDateTime,
    size: data.quota?.used || 0,
    tags: [] as string[],
    permissions: '',
    starred: false,
    etag: '',
    shareTypes: [] as number[],
    privateLink: data.webUrl,
    downloadURL: '',
    owner: data.owner?.user,
    disabled,
    root: data.root,
    spaceQuota: data.quota,
    spaceImageData,
    spaceReadmeData,
    hasTrashedItems: data['@libre.graph.hasTrashedItems'] || false,
    graphPermissions: undefined as string[],
    canUpload: function ({ user }: { user?: User } = {}): boolean {
      if (isPersonalSpaceResource(this) && this.isOwner(user)) {
        return true
      }
      return this.graphPermissions?.includes(GraphSharePermission.createUpload)
    },
    canDownload: function () {
      return true
    },
    canBeDeleted: function ({ ability }: { user?: User; ability?: Ability } = {}) {
      if (!this.disabled) {
        return false
      }
      if (ability?.can('delete-all', 'Drive')) {
        return true
      }
      // FIXME: server permissions are a mess currently: https://github.com/opencloud-eu/opencloud/issues/10
      return this.graphPermissions?.includes(GraphSharePermission.deletePermissions)
    },
    canRename: function ({ ability }: { user?: User; ability?: Ability } = {}) {
      if (ability?.can('update-all', 'Drive')) {
        return true
      }
      // FIXME: server permissions are a mess currently: https://github.com/opencloud-eu/opencloud/issues/10
      return this.graphPermissions?.includes(GraphSharePermission.deletePermissions)
    },
    canEditDescription: function ({ ability }: { user?: User; ability?: Ability } = {}) {
      if (ability?.can('update-all', 'Drive')) {
        return true
      }
      // FIXME: server permissions are a mess currently: https://github.com/opencloud-eu/opencloud/issues/10
      return this.graphPermissions?.includes(GraphSharePermission.deletePermissions)
    },
    canRestore: function ({ ability }: { user?: User; ability?: Ability } = {}) {
      if (!this.disabled) {
        return false
      }
      if (ability?.can('update-all', 'Drive')) {
        return true
      }
      // FIXME: server permissions are a mess currently: https://github.com/opencloud-eu/opencloud/issues/10
      return this.graphPermissions?.includes(GraphSharePermission.deletePermissions)
    },
    canDisable: function ({ ability }: { user?: User; ability?: Ability } = {}) {
      if (this.disabled) {
        return false
      }
      if (ability?.can('delete-all', 'Drive')) {
        return true
      }
      // FIXME: server permissions are a mess currently: https://github.com/opencloud-eu/opencloud/issues/10
      return this.graphPermissions?.includes(GraphSharePermission.deletePermissions)
    },
    canShare: function () {
      return this.graphPermissions?.includes(GraphSharePermission.createPermissions)
    },
    canEditImage: function () {
      if (this.disabled) {
        return false
      }
      // FIXME: server permissions are a mess currently: https://github.com/opencloud-eu/opencloud/issues/10
      return this.graphPermissions?.includes(GraphSharePermission.deletePermissions)
    },
    canEditReadme: function () {
      if (this.disabled) {
        return false
      }
      // FIXME: server permissions are a mess currently: https://github.com/opencloud-eu/opencloud/issues/10
      return this.graphPermissions?.includes(GraphSharePermission.deletePermissions)
    },
    canRestoreFromTrashbin: function () {
      return this.graphPermissions?.includes(GraphSharePermission.updateDeleted)
    },
    canDeleteFromTrashBin: function ({ user }: { user?: User } = {}) {
      if (isPersonalSpaceResource(this) && this.isOwner(user)) {
        return true
      }
      // FIXME: server permissions are a mess currently: https://github.com/opencloud-eu/opencloud/issues/10
      return this.graphPermissions?.includes(GraphSharePermission.deletePermissions)
    },
    canListVersions: function ({ user }: { user?: User } = {}) {
      if (isPersonalSpaceResource(this) && this.isOwner(user)) {
        return true
      }
      return this.graphPermissions?.includes(GraphSharePermission.readVersions)
    },
    canCreate: function () {
      return true
    },
    canEditTags: function () {
      return false
    },
    isMounted: function () {
      return true
    },
    isReceivedShare: function () {
      return false
    },
    isShareRoot: function () {
      return ['share', 'mountpoint', 'public'].includes(data.driveType)
    },
    getDomSelector: () => extractDomSelector(data.id),
    getDriveAliasAndItem({ path }: Resource): string {
      return urlJoin(this.driveAlias, path, {
        leadingSlash: false
      })
    },
    getWebDavUrl({ path }: { path: string }): string {
      return urlJoin(webDavUrl, path)
    },
    getWebDavTrashUrl({ path }: { path: string }): string {
      return urlJoin(webDavTrashUrl, path)
    },
    isOwner(user: User): boolean {
      return user?.id === this.owner?.id
    }
  } satisfies SpaceResource
  Object.defineProperty(s, 'nodeId', {
    get() {
      return extractNodeId(this.id)
    }
  })
  return s
}

// build a space image resource based on a given space by its spaceImageData
export function buildSpaceImageResource(space: SpaceResource): Resource {
  return {
    id: space.spaceImageData.id,
    name: space.spaceImageData.name,
    etag: space.spaceImageData.eTag,
    extension: extractExtensionFromFile({ name: space.spaceImageData.name } as Resource),
    mimeType: space.spaceImageData.file.mimeType,
    type: 'file',
    webDavPath: urlJoin(space.webDavPath, '.space', space.spaceImageData.name),
    hasPreview: () => true,
    canDownload: () => true
  } as Resource
}
