/**
 * The highlight colors of the PDF.js viewer, the first one is the default. PDF.js uses the
 * high contrast variant when the system asks for more contrast.
 */
export const highlightColors = [
  { name: 'yellow', value: '#FFFF98', highContrast: '#FFFFCC' },
  { name: 'green', value: '#53FFBC', highContrast: '#53FFBC' },
  { name: 'blue', value: '#80EBFF', highContrast: '#80EBFF' },
  { name: 'pink', value: '#FFCBE6', highContrast: '#F6B8FF' },
  { name: 'red', value: '#FF4F5F', highContrast: '#C50043' }
] as const

export type HighlightColorName = (typeof highlightColors)[number]['name']

/** The colors in the format of PDF.js' `annotationEditorHighlightColors` option. */
export const highlightColorsOption = [
  ...highlightColors.map(({ name, value }) => `${name}=${value}`),
  ...highlightColors.map(({ name, highContrast }) => `${name}_HCM=${highContrast}`)
].join(',')
