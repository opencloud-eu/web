import type { SpaceResource } from '../../helpers'
import type { Drive, DriveUpdate } from '../generated'
import type { GraphRequestOptions } from '../types'

export interface GraphDrives {
  getDrive: (id: string, requestOptions?: GraphRequestOptions) => Promise<SpaceResource>
  createDrive: (data: Drive, requestOptions?: GraphRequestOptions) => Promise<SpaceResource>
  updateDrive: (
    id: string,
    data: DriveUpdate,
    requestOptions?: GraphRequestOptions
  ) => Promise<SpaceResource>
  disableDrive: (
    id: string,
    ifMatch?: string,
    requestOptions?: GraphRequestOptions
  ) => Promise<void>
  deleteDrive: (id: string, ifMatch?: string, requestOptions?: GraphRequestOptions) => Promise<void>
  listMyDrives: (
    options?: {
      orderBy?: string
      filter?: string
      expand?: string
    },
    requestOptions?: GraphRequestOptions
  ) => Promise<SpaceResource[]>
  listAllDrives: (
    options?: {
      orderBy?: string
      filter?: string
      expand?: string
    },
    requestOptions?: GraphRequestOptions
  ) => Promise<SpaceResource[]>
}
