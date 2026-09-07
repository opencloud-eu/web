import {
  buildResourceFromDriveItem,
  buildResourcesFromDriveItems,
  graphDriveIdOfSpace,
  graphRefOfSpace,
  isPublicSpaceResource,
  isShareSpaceResource,
  SpaceResource,
  urlJoin
} from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import {
  DriveItem,
  GetDriveItemV1ExpandEnum,
  GetDriveItemV1SelectEnum
} from '@opencloud-eu/web-client/graph/generated'
const graphListingSelect = new Set<GetDriveItemV1SelectEnum>([
  '@libre.graph.permissions.actions.allowedValues',
  '@libre.graph.shareTypes',
  // the callers that used to ask for the DownloadURL dav property
  '@microsoft.graph.downloadUrl'
])
// thumbnails answer whether an item has a preview, for the folder and its
// children alike, which saves the client from guessing by mime type
const graphListingExpand = new Set<GetDriveItemV1ExpandEnum>(['children', 'thumbnails'])
const graphThumbnailsExpand = new Set<GetDriveItemV1ExpandEnum>(['thumbnails'])

// A share space is rooted at the shared item, but graph answers with paths in
// the owner's drive: the stat of a received share reports the share root as
// "/<name>" rather than "/". Inside a share the requested path is therefore
// authoritative, everywhere else the item is (the route correction in the
// loader exists to fix a stale url, and the drive root reports itself as '.').
const currentPathOf = (driveItem: DriveItem, space: SpaceResource, path: string) => {
  if (isShareSpaceResource(space)) {
    return path || '/'
  }
  const parentPath = driveItem.parentReference?.path
  return !parentPath || parentPath === '.'
    ? '/'
    : urlJoin(parentPath, driveItem.name, { leadingSlash: true })
}

// listFilesViaGraph lists a folder through graph, folder and children in one
// request via $expand=children, the same shape PROPFIND with Depth: 1 returns.
// Vault translation happens in the decorator above, this is the plain listing.
export const listFilesViaGraph = async ({
  graphClient,
  space,
  path,
  fileId,
  signal,
  withChildren = true
}: {
  graphClient: Graph
  space: SpaceResource
  path?: string
  fileId?: string
  signal?: AbortSignal
  withChildren?: boolean
}) => {
  const driveId = graphDriveIdOfSpace(space)
  const driveItem = await graphClient.driveItems.statDriveItem(
    driveId,
    graphRefOfSpace(space, { path, fileId }),
    {
      select: graphListingSelect,
      expand: withChildren ? graphListingExpand : graphThumbnailsExpand
    },
    {
      signal,
      ...(isPublicSpaceResource(space) && { headers: { 'public-token': space.id.toString() } })
    }
  )

  const currentPath = currentPathOf(driveItem, space, path)
  const currentFolder = buildResourceFromDriveItem(driveItem, space, '', currentPath)

  return {
    driveItem,
    resource: currentFolder,
    children: buildResourcesFromDriveItems(driveItem.children || [], space, currentFolder.path)
  }
}
