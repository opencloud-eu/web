import type { Language } from 'vue3-gettext'

export type SearchFilterOption = {
  id: string
  label: string
}

export type SearchMediaTypeFilterOption = SearchFilterOption & {
  icon: string
}

const mediaTypeIcons: Record<string, string> = {
  file: 'txt',
  folder: 'folder',
  document: 'doc',
  spreadsheet: 'xls',
  presentation: 'ppt',
  pdf: 'pdf',
  image: 'jpg',
  video: 'mp4',
  audio: 'mp3',
  archive: 'zip'
}

function getLastModifiedLabel(keyword: string, $gettext: Language['$gettext']) {
  switch (keyword) {
    case 'today':
      return $gettext('today')
    case 'yesterday':
      return $gettext('yesterday')
    case 'this week':
      return $gettext('this week')
    case 'last week':
      return $gettext('last week')
    case 'last 7 days':
      return $gettext('last 7 days')
    case 'this month':
      return $gettext('this month')
    case 'last month':
      return $gettext('last month')
    case 'last 30 days':
      return $gettext('last 30 days')
    case 'this year':
      return $gettext('this year')
    case 'last year':
      return $gettext('last year')
    default:
      return keyword
  }
}

function getMediaTypeLabel(keyword: string, $gettext: Language['$gettext']) {
  switch (keyword) {
    case 'file':
      return $gettext('File')
    case 'folder':
      return $gettext('Folder')
    case 'document':
      return $gettext('Document')
    case 'spreadsheet':
      return $gettext('Spreadsheet')
    case 'presentation':
      return $gettext('Presentation')
    case 'pdf':
      return $gettext('PDF')
    case 'image':
      return $gettext('Image')
    case 'video':
      return $gettext('Video')
    case 'audio':
      return $gettext('Audio')
    case 'archive':
      return $gettext('Archive')
    default:
      return null
  }
}

export function getLastModifiedFilterOptions(
  keywords: string[] | undefined,
  $gettext: Language['$gettext']
): SearchFilterOption[] {
  return (
    keywords?.map((keyword) => ({
      id: keyword,
      label: getLastModifiedLabel(keyword, $gettext)
    })) ?? []
  )
}

export function getMediaTypeFilterOptions(
  keywords: string[] | undefined,
  $gettext: Language['$gettext']
): SearchMediaTypeFilterOption[] {
  const availableKeywords = keywords ?? []
  const options: SearchMediaTypeFilterOption[] = []

  for (const keyword of availableKeywords) {
    const label = getMediaTypeLabel(keyword, $gettext)
    if (!label) {
      continue
    }
    options.push({
      id: keyword,
      label,
      icon: mediaTypeIcons[keyword]
    })
  }

  return options
}
