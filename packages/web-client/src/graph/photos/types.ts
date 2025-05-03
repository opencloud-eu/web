import type { GraphRequestOptions } from '../types'

export interface GraphPhotos {
  getOwnUserPhoto: (requestOptions?: GraphRequestOptions) => Promise<File>
  deleteOwnUserPhoto: (requestOptions?: GraphRequestOptions) => Promise<void>
  updateOwnUserPhotoPatch: (body: File, requestOptions?: GraphRequestOptions) => Promise<void>
}
