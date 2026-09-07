import {
  buildResourceFromDriveItem,
  buildResourcesFromDriveItems,
  graphDriveIdOfSpace,
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
// the specific store / helper modules, not the barrels: this file sits in the
// services layer and re-entering those barrels creates an evaluation cycle
import { useExtensionRegistry } from '../../../composables/piniaStores/extensionRegistry'
import { applyVaultFromServer, toVaultServerPath } from '../../../helpers/vaultTranslate'

const graphListingSelect = new Set<GetDriveItemV1SelectEnum>([
  '@libre.graph.permissions.actions.allowedValues',
  '@libre.graph.shareTypes'
])
// thumbnails answer whether an item has a preview, for the folder and its
// children alike, which saves the client from guessing by mime type
const graphListingExpand = new Set<GetDriveItemV1ExpandEnum>(['children', 'thumbnails'])

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
// Lives next to the loader rather than inside it so it can be tested without
// importing the loader, which pulls the folderService singleton along.
export const listFilesViaGraph = async ({
  graphClient,
  space,
  path,
  fileId,
  signal
}: {
  graphClient: Graph
  space: SpaceResource
  path: string
  fileId: string
  signal: AbortSignal
}) => {
  const driveId = graphDriveIdOfSpace(space)
  // graph has no path lookup for the drive root, it is addressed by its id
  const isRoot = !path || path === '/'
  const itemId = fileId || (isRoot ? space.root?.id : undefined)
  const registry = useExtensionRegistry()
  // inside a vault the server knows the encrypted names only
  const serverPath = await toVaultServerPath(registry, space, path)
  const driveItem = await graphClient.driveItems.statDriveItem(
    driveId,
    itemId ? { itemId } : { path: serverPath },
    { select: graphListingSelect, expand: graphListingExpand },
    { signal }
  )

  const currentPath = currentPathOf(driveItem, space, path)
  const currentFolder = buildResourceFromDriveItem(driveItem, space, '', currentPath)
  const children = buildResourcesFromDriveItems(driveItem.children || [], space, currentFolder.path)

  // the webdav client has its vault decorator, the graph path translates here
  await applyVaultFromServer(registry, space, [currentFolder, ...children])

  return { resource: currentFolder, children }
}
