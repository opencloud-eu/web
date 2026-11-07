import type { Resource, SpaceResource } from '@opencloud-eu/web-client'

export enum ResolveStrategy {
  SKIP,
  REPLACE,
  KEEP_BOTH,
  MERGE,
  /** the dialog was closed, the whole operation must be cancelled */
  CANCEL
}
export interface ResolveConflict {
  strategy: ResolveStrategy
  doForAllConflicts: boolean
}

export enum TransferType {
  COPY,
  MOVE
}

export type TransferData = {
  resource: Resource
  sourceSpace: SpaceResource
  targetSpace: SpaceResource
  targetFolder: Resource
  path: string
  overwrite: boolean
  transferType: TransferType
}
