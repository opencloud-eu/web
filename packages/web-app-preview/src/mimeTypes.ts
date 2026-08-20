export const mimeTypes = [
  'audio/flac',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/x-flac',
  'audio/x-wav',
  'image/avif',
  'image/gif',
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/tiff',
  'image/bmp',
  'image/webp',
  'image/x-ms-bmp',
  'video/mp4',
  'video/quicktime',
  'video/webm'
]

/**
 * Subset of the above that the browser cannot decode on its own, so the app can
 * only show them if the server renders a preview. Whether it does depends on how
 * the thumbnailer was built and on decoders that are not installed everywhere,
 * so this is decided per resource via `hasPreview()` rather than up front.
 */
export const serverRenderedMimeTypes = [
  'image/avif',
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence'
]
