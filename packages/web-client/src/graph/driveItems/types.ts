import {
  DriveItem,
  GetDriveItemChildrenSelectEnum,
  GetDriveItemV1ExpandEnum,
  GetDriveItemV1SelectEnum
} from '../generated'
import type { GraphRequestOptions } from '../types'

export interface DriveItemStatOptions {
  select?: Set<GetDriveItemV1SelectEnum>
  expand?: Set<GetDriveItemV1ExpandEnum>
}

export interface DriveItemChildrenOptions {
  select?: Set<GetDriveItemChildrenSelectEnum>
}

// a driveItem is addressed either by its id or by its path, never by both
export type DriveItemRef = { itemId: string; path?: never } | { itemId?: never; path: string }

export interface GraphDriveItems {
  listDriveItemChildren: (
    driveId: string,
    itemId: string,
    options?: DriveItemChildrenOptions,
    requestOptions?: GraphRequestOptions
  ) => Promise<DriveItem[]>
  getDriveItem: (
    driveId: string,
    itemId: string,
    requestOptions?: GraphRequestOptions
  ) => Promise<DriveItem>
  statDriveItem: (
    driveId: string,
    ref: DriveItemRef,
    options?: DriveItemStatOptions,
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
