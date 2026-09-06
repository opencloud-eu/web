import {
  buildResourceFromDriveItem,
  buildResourcesFromDriveItems,
  SpaceResource,
  urlJoin
} from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import {
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
const graphListingExpand = new Set<GetDriveItemV1ExpandEnum>(['children'])

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
  const driveId = space.id.toString()
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

  // the item is authoritative, not the url: the route correction in the loader
  // exists to fix a stale path. the drive root reports itself as '.'
  const parentPath = driveItem.parentReference?.path
  const currentPath =
    !parentPath || parentPath === '.'
      ? '/'
      : urlJoin(parentPath, driveItem.name, { leadingSlash: true })
  const currentFolder = buildResourceFromDriveItem(driveItem, space, '', currentPath)
  const children = buildResourcesFromDriveItems(driveItem.children || [], space, currentFolder.path)

  // the webdav client has its vault decorator, the graph path translates here
  await applyVaultFromServer(registry, space, [currentFolder, ...children])

  return { resource: currentFolder, children }
}
