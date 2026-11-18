export interface AncestorMetaDataValue {
  id: string
  shareTypes: number[]
  parentFolderId: string
  spaceId: string
  path: string
}

export type AncestorMetaData = Record<string, AncestorMetaDataValue>

export type FederatedUser = {
  display_name: string
  idp: string
  mail: string
  user_id: string
}

export type FederatedConnection = FederatedUser & {
  id: string
}

export interface UpdateChannel {
  current_version: string
  url: string
  /** versions with a critical update, superseded by `critical_range` */
  critical?: string[]
  /** semver range of the versions with a critical update, e.g. `1.0.0 - 3.0.0 || 5.x` */
  critical_range?: string
}

export interface Updates {
  channels: Record<string, UpdateChannel>
}
