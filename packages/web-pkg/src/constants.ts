export abstract class ImageDimension {
  static readonly Thumbnail: [number, number] = [36, 36]
  static readonly Small: [number, number] = [320, 320]
  static readonly Medium: [number, number] = [448, 448]
  /** @deprecated use `previewDimensions` of `useTileSize` instead */
  static readonly Tile: [number, number] = [512, 512]
  static readonly Preview: [number, number] = [1200, 1200]
  static readonly Avatar: number = 64
}

export abstract class ImageType {
  static readonly Thumbnail: string = 'thumbnail'
  static readonly Preview: string = 'preview'
  static readonly Avatar: string = 'avatar'
}

export const AVATAR_UPLOAD_MAX_FILE_SIZE_MB = 10

export const RESOURCE_MAX_CHARACTER_LENGTH = 63

export const RESOURCE_NAME_MAX_BYTES = 256
