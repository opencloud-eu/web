import { useGettext } from 'vue3-gettext'

type Gettext = ReturnType<typeof useGettext>['$gettext']

// app registry descriptions are untranslated, so known types get their own
export function getMimeTypeDescription(
  mimeType: string,
  $gettext: Gettext
): (() => string) | undefined {
  const descriptions: Record<string, () => string> = {
    'application/vnd.oasis.opendocument.text': () => $gettext('OpenDocument text'),
    'application/vnd.oasis.opendocument.spreadsheet': () => $gettext('OpenDocument spreadsheet'),
    'application/vnd.oasis.opendocument.presentation': () => $gettext('OpenDocument presentation'),
    'application/vnd.oasis.opendocument.graphics': () => $gettext('OpenDocument drawing'),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': () =>
      $gettext('Word document'),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.form': () =>
      $gettext('Fillable form'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': () =>
      $gettext('Excel spreadsheet'),
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': () =>
      $gettext('PowerPoint presentation'),
    'application/vnd.jupyter': () => $gettext('Code and notes'),
    'text/markdown': () => $gettext('Formatted plain text')
  }
  return descriptions[mimeType]
}
