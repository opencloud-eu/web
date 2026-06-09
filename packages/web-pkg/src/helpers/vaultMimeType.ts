// Extension -> mime-type lookup for vault resources. The server only knows the
// encrypted blob (mime typically application/octet-stream, no extension), so
// once a vault name is decrypted we re-derive a mime from its cleartext
// extension. Preview / mediaviewer / file-icon code gate on mimeType, so this
// keeps those apps working for vault content. Mirrors the shapes they check.
const MIME_BY_EXTENSION: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  yml: 'text/yaml',
  yaml: 'text/yaml',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  zip: 'application/zip',
  epub: 'application/epub+zip'
}

export function mimeTypeForExtension(extension: string | undefined): string | undefined {
  if (!extension) return undefined
  return MIME_BY_EXTENSION[extension.toLowerCase()]
}
