import { unref, Ref } from 'vue'

import { useGetMatchingSpace } from '../spaces'
import { createFileRouteOptions } from '../../helpers/router'
import { createLocationSpaces, createLocationTrash, isLocationTrashActive } from '../../router'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ConfigStore } from '../piniaStores'
import { useRouter } from '../router'

export type ResourceRouteResolverOptions = {
  configStore?: ConfigStore
  space?: Ref<SpaceResource>
}

export const useResourceRouteResolver = (options: ResourceRouteResolverOptions = {}) => {
  const router = useRouter()
  const { getMatchingSpace } = useGetMatchingSpace(options)

  const createFolderLink = (createTargetRouteOptions: {
    path: string
    resource: Resource | SpaceResource
    fileId?: string
  }) => {
    const { path, fileId, resource } = createTargetRouteOptions

    const space = unref(options.space) || getMatchingSpace(resource)
    if (!space) {
      return {}
    }
    if (isLocationTrashActive(router, 'files-trash-overview')) {
      return createLocationTrash('files-trash-generic', createFileRouteOptions(space))
    }
    return createLocationSpaces(
      'files-spaces-generic',
      createFileRouteOptions(space, { path, fileId })
    )
  }

  return {
    createFolderLink
  }
}
