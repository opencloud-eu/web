import { FillType, Icon, NamedIcon } from '@opencloud-eu/design-system/helpers'

export type IconFillType = FillType
/** @deprecated use `Icon` from the design system instead */
export type IconType = NamedIcon & {
  /** @deprecated has no effect, `OcIcon` resolves dark variants by icon name */
  hasDarkVariant?: boolean
  /** @deprecated has no effect */
  fillsBox?: boolean
  /** @deprecated has no effect, use the `uniqueIds` prop of `OcIcon` instead */
  uniqueIds?: boolean
}

export type ResourceIconMapping = {
  mimeType: Record<string, Icon>
  extension: Record<string, Icon>
  folderExtension?: Record<string, Icon>
}
export const resourceIconMappingInjectionKey = 'oc-resource-icon-mapping'

const fileIcon = {
  archive: {
    icon: 'resource-type-archive',
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
    icon: 'resource-type-audio',
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
  bpmn: {
    icon: 'resource-type-bpmn',
    extensions: ['bpmn']
  },
  code: {
    icon: 'resource-type-code',
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
    icon: 'resource-type-csv',
    extensions: ['csv']
  },
  html: {
    icon: 'resource-type-html',
    extensions: ['htm', 'html']
  },
  svg: {
    icon: 'resource-type-svg',
    extensions: ['svg']
  },
  default: {
    icon: 'resource-type-file',
    extensions: ['accdb', 'rss', 'swf']
  },
  dicom: {
    icon: 'resource-type-dicom',
    extensions: ['dcm']
  },
  drawio: {
    icon: 'resource-type-drawio',
    extensions: ['drawio']
  },
  document: {
    icon: 'resource-type-document',
    extensions: ['doc', 'docm', 'docx', 'dot', 'dotx', 'lwp', 'odt', 'one', 'vsd', 'wpd']
  },
  ifc: {
    icon: 'resource-type-ifc',
    extensions: ['ifc']
  },
  ipynb: {
    icon: 'resource-type-jupyter',
    extensions: ['ipynb']
  },
  image: {
    icon: 'resource-type-image',
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
    icon: 'resource-type-form',
    extensions: ['docf', 'docxf', 'oform']
  },
  markdown: {
    icon: 'resource-type-markdown',
    extensions: ['md', 'markdown']
  },
  game: {
    icon: 'resource-type-game',
    extensions: ['gb', 'gbc', 'gba', 'nds', '3ds', 'nes', 'snes', 'sfc', 'smc', 'n64', 'v64', 'z64']
  },
  graphic: {
    icon: 'resource-type-graphic',
    extensions: ['odg']
  },
  whiteboard: {
    icon: 'resource-type-whiteboard',
    extensions: ['excalidraw']
  },
  pdf: {
    icon: 'resource-type-pdf',
    extensions: ['pdf']
  },
  presentation: {
    icon: 'resource-type-presentation',
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
    icon: 'resource-type-root',
    extensions: ['root']
  },
  spreadsheet: {
    icon: 'resource-type-spreadsheet',
    extensions: ['ods', 'xla', 'xlam', 'xls', 'xlsb', 'xlsm', 'xlsx', 'xlt', 'xltm', 'xltx']
  },
  text: {
    icon: 'resource-type-text',
    extensions: ['cb7', 'cba', 'cbr', 'cbt', 'cbtc', 'cbz', 'cvbdl', 'eml', 'mdb', 'tex', 'txt']
  },
  url: {
    icon: 'resource-type-url',
    extensions: ['url']
  },
  video: {
    icon: 'resource-type-video',
    extensions: ['mov', 'mp4', 'webm', 'wmv']
  },
  epub: {
    icon: 'resource-type-book',
    extensions: ['epub']
  },
  board: {
    icon: 'resource-type-board',
    extensions: ['ggs']
  },
  note: {
    icon: 'resource-type-note',
    extensions: ['note', 'ocnote']
  }
}

/** @deprecated `OcIcon` resolves dark variants by icon name */
export function getResourceIconName(icon: IconType, isDark: boolean) {
  return icon.hasDarkVariant && isDark ? `${icon.name}-dark` : icon.name
}

export function createDefaultFileIconMapping() {
  const fileIconMapping: Record<string, Icon> = {}

  Object.values(fileIcon).forEach((value) => {
    value.extensions.forEach((extension) => {
      fileIconMapping[extension] = value.icon
    })
  })

  return fileIconMapping
}
