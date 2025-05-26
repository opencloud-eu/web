import { MePhotoApiFactory, UserPhotoApiFactory } from './../generated'
import type { GraphFactoryOptions } from './../types'
import type { GraphPhotos } from './types'

export const PhotoFactory = ({ axiosClient, config }: GraphFactoryOptions): GraphPhotos => {
  const mePhotoApiFactory = MePhotoApiFactory(config, config.basePath, axiosClient)
  const userPhotoApiFactory = UserPhotoApiFactory(config, config.basePath, axiosClient)
  return {
    async getOwnUserPhoto(requestOptions) {
      const { data } = await mePhotoApiFactory.getOwnUserPhoto(requestOptions)
      return data
    },
    async deleteOwnUserPhoto(requestOptions) {
      const { data } = await mePhotoApiFactory.deleteOwnUserPhoto(requestOptions)
      return data
    },
    async updateOwnUserPhotoPatch(body, requestOptions) {
      const { data } = await mePhotoApiFactory.updateOwnUserPhotoPatch(body, requestOptions)
      return data
    },
    async getUserPhoto(userId, requestOptions) {
      const { data } = await userPhotoApiFactory.getUserPhoto(userId, requestOptions)
      return data
    }
  }
}
