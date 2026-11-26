import { SupportedImageMimeTypes } from 'pdfjs-dist'

/**
 * The image types of PDF.js without vector images, e.g. for signatures: they are found in the
 * pixels of a photo or scan, and the file input would show a vector image as it is.
 */
export const RASTER_IMAGE_TYPES = [...SupportedImageMimeTypes].filter(
  (type) => type !== 'image/svg+xml'
)

export function isRasterImage(file: File) {
  return RASTER_IMAGE_TYPES.includes(file.type)
}
