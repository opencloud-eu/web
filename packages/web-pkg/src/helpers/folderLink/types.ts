import { Resource, SpaceResource } from '@opencloud-eu/web-client'

export interface CreateTargetRouteOptions {
  path: string
  fileId?: string | number
  resource: Resource | SpaceResource
}
