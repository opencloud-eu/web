import { useRouter } from './useRouter'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { createFileRouteOptions } from '../../helpers/router'
import { Router } from 'vue-router'

export interface FileRouteReplaceOptions {
  router?: Router
}

export const useFileRouteReplace = (options: FileRouteReplaceOptions = {}) => {
  const router = options.router || useRouter()

  const replaceInvalidFileRoute = ({
    space,
    resource,
    path,
    fileId
  }: {
    space: SpaceResource
    resource: Resource
    path: string
    fileId?: string | number
  }): boolean => {
    if (path === resource.path && fileId === resource.fileId) {
      return false
    }

    const routeOptions = createFileRouteOptions(space, resource)
    router.replace({
      ...routeOptions,
      query: { ...router.currentRoute.value.query, ...routeOptions.query }
    })
    return true
  }

  return {
    replaceInvalidFileRoute
  }
}
