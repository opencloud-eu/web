import { isProjectSpaceResource, SpaceResource } from '@opencloud-eu/web-client'

/**
 * The root item of a project space (e.g. in search results or SSE events) has the bare space id
 * as its parent, everything inside a space has the space root (`<space id>!<root id>`) as parent.
 * Returns the matching project space for such a root item, so it can be handled as a space.
 */
export function getProjectSpaceOfRootItem(
  spaces: SpaceResource[],
  parentId: string
): SpaceResource | undefined {
  return spaces.find((space) => isProjectSpaceResource(space) && space.id === parentId)
}
