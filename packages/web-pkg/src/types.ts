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
}

export interface Updates {
  channels: Record<string, UpdateChannel>
}
