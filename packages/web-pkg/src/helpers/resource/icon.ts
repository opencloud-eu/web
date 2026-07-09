import { FillType } from '@opencloud-eu/design-system/helpers'

export type IconFillType = FillType
export type IconType = {
  name: string
  color?: string
  fillType?: IconFillType
  hasDarkVariant?: boolean
}

export type ResourceIconMapping = Record<'mimeType' | 'extension', Record<string, IconType>>
export const resourceIconMappingInjectionKey = 'oc-resource-icon-mapping'

const fileIcon = {
  archive: {
    icon: { name: 'resource-type-archive' },
    extensions: [
      '7z',
      'apk',
      'bz2',
      'deb',
      'gz',
      'gzip',
      'rar',
      'tar',
      'tar.bz2',
      'tar.gz',
      'tar.xz',
      'tbz2',
      'tgz',
      'zip'
    ]
  },
  audio: {
    icon: { name: 'resource-type-audio' },
    extensions: [
      '3gp',
      '8svx',
      'aa',
      'aac',
      'aax',
      'act',
      'aiff',
      'alac',
      'amr',
      'ape',
      'au',
      'awb',
      'cda',
      'dss',
      'dvf',
      'flac',
      'gsm',
      'iklax',
      'ivs',
      'm4a',
      'm4b',
      'm4p',
      'mmf',
      'mogg',
      'movpkg',
      'mp3',
      'mpc',
      'msv',
      'nmf',
      'oga',
      'ogga',
      'opus',
      'ra',
      'raw',
      'rf64',
      'rm',
      'sln',
      'tta',
      'voc',
      'vox',
      'wav',
      'wma',
      'wv'
    ]
  },
  code: {
    icon: { name: 'resource-type-code', hasDarkVariant: true },
    extensions: [
      'bash',
      'c++',
      'c',
      'cc',
      'cpp',
      'css',
      'feature',
      'go',
      'h',
      'hh',
      'hpp',
      'java',
      'js',
      'json',
      'php',
      'pl',
      'py',
      'scss',
      'sh',
      'sh-lib',
      'sql',
      'ts',
      'xml',
      'yaml',
      'yml'
    ]
  },
  csv: {
    icon: { name: 'resource-type-csv', hasDarkVariant: true },
    extensions: ['csv']
  },
  html: {
    icon: { name: 'resource-type-html', hasDarkVariant: true },
    extensions: ['htm', 'html']
  },
  svg: {
    icon: { name: 'resource-type-svg', hasDarkVariant: true },
    extensions: ['svg']
  },
  default: {
    icon: { name: 'resource-type-file', hasDarkVariant: true },
    extensions: ['accdb', 'rss', 'swf']
  },
  drawio: {
    icon: { name: 'resource-type-drawio', color: 'var(--oc-color-icon-drawio)' },
    extensions: ['drawio']
  },
  document: {
    icon: { name: 'resource-type-document', hasDarkVariant: true },
    extensions: ['doc', 'docm', 'docx', 'dot', 'dotx', 'lwp', 'odt', 'one', 'vsd', 'wpd']
  },
  ifc: {
    icon: { name: 'resource-type-ifc', color: 'var(--oc-color-icon-ifc)' },
    extensions: ['ifc']
  },
  ipynb: {
    icon: { name: 'resource-type-jupyter', hasDarkVariant: true },
    extensions: ['ipynb']
  },
  image: {
    icon: { name: 'resource-type-image' },
    extensions: [
      'ai',
      'cdr',
      'eot',
      'eps',
      'gif',
      'jpeg',
      'jpg',
      'otf',
      'pfb',
      'png',
      'ps',
      'psd',
      'ttf',
      'webp',
      'woff',
      'xcf'
    ]
  },
  form: {
    icon: { name: 'resource-type-form', color: 'var(--oc-color-icon-form)' },
    extensions: ['docf', 'docxf', 'oform']
  },
  markdown: {
    icon: { name: 'resource-type-markdown', hasDarkVariant: true },
    extensions: ['md', 'markdown']
  },
  nes: {
    icon: { name: 'resource-type-markdown-nes' },
    extensions: ['nes']
  },
  odg: {
    icon: { name: 'resource-type-graphic', color: 'var(--oc-color-icon-graphic)' },
    extensions: ['odg']
  },
  pdf: {
    icon: { name: 'resource-type-pdf', hasDarkVariant: true },
    extensions: ['pdf']
  },
  presentation: {
    icon: { name: 'resource-type-presentation', hasDarkVariant: true },
    extensions: [
      'odp',
      'otp',
      'pot',
      'potm',
      'potx',
      'ppa',
      'ppam',
      'pps',
      'ppsm',
      'ppsx',
      'ppt',
      'pptm',
      'pptx'
    ]
  },
  root: {
    icon: { name: 'resource-type-root', color: 'var(--oc-color-icon-root)' },
    extensions: ['root']
  },
  spreadsheet: {
    icon: { name: 'resource-type-spreadsheet', hasDarkVariant: true },
    extensions: ['ods', 'xla', 'xlam', 'xls', 'xlsb', 'xlsm', 'xlsx', 'xlt', 'xltm', 'xltx']
  },
  text: {
    icon: { name: 'resource-type-text', hasDarkVariant: true },
    extensions: ['cb7', 'cba', 'cbr', 'cbt', 'cbtc', 'cbz', 'cvbdl', 'eml', 'mdb', 'tex', 'txt']
  },
  url: {
    icon: { name: 'resource-type-url', color: 'var(--oc-role-on-surface)' },
    extensions: ['url']
  },
  video: {
    icon: {
      name: 'resource-type-video'
    },
    extensions: ['mov', 'mp4', 'webm', 'wmv']
  },
  epub: {
    icon: { name: 'resource-type-book', hasDarkVariant: true },
    extensions: ['epub']
  },
  board: {
    icon: { name: 'resource-type-board' },
    extensions: ['ggs']
  },
  notes: {
    icon: { name: 'resource-type-sticky-note', hasDarkVariant: true },
    extensions: ['ocnb']
  }
}

export function getResourceIconName(icon: IconType, isDark: boolean) {
  return icon.hasDarkVariant && isDark ? `${icon.name}-dark` : icon.name
}

export function createDefaultFileIconMapping() {
  const fileIconMapping: Record<string, IconType> = {}

  Object.values(fileIcon).forEach((value) => {
    value.extensions.forEach((extension) => {
      fileIconMapping[extension] = value.icon
    })
  })

  return fileIconMapping
}
