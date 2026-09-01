import { DriveItem } from '../generated'
import type { GraphRequestOptions } from '../types'

export interface DriveItemQueryOptions {
  select?: string[]
  expand?: string[]
}

export interface GraphDriveItems {
  listDriveItemChildren: (
    driveId: string,
    itemId: string,
    options?: DriveItemQueryOptions,
    requestOptions?: GraphRequestOptions
  ) => Promise<DriveItem[]>
  getDriveItem: (
    driveId: string,
    itemId: string,
    requestOptions?: GraphRequestOptions
  ) => Promise<DriveItem>
  statDriveItem: (
    driveId: string,
    ref: { itemId?: string; path?: string },
    options?: DriveItemQueryOptions,
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
  followDriveItem: (itemId: string, requestOptions?: GraphRequestOptions) => Promise<DriveItem>
  unfollowDriveItem: (itemId: string, requestOptions?: GraphRequestOptions) => Promise<void>
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
