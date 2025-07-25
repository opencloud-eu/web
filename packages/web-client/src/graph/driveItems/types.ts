import { DriveItem } from '../generated'
import type { GraphRequestOptions } from '../types'

export interface GraphDriveItems {
  getDriveItem: (
    driveId: string,
    itemId: string,
    requestOptions?: GraphRequestOptions
  ) => Promise<DriveItem>
  createDriveItem: (
    driveId: string,
    data: DriveItem,
    requestOptions?: GraphRequestOptions
  ) => Promise<DriveItem>
  updateDriveItem: (
    driveId: string,
    itemId: string,
    data: DriveItem,
    requestOptions?: GraphRequestOptions
  ) => Promise<DriveItem>
  deleteDriveItem: (
    driveId: string,
    itemId: string,
    requestOptions?: GraphRequestOptions
  ) => Promise<void>
  listSharedByMe: (
    options?: {
      expand?: Set<'thumbnails'>
    },
    requestOptions?: GraphRequestOptions
  ) => Promise<DriveItem[]>
  listSharedWithMe: (
    options?: {
      expand?: Set<'thumbnails'>
    },
    requestOptions?: GraphRequestOptions
  ) => Promise<DriveItem[]>
}
