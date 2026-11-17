import { FieldType, SizeType } from './types'

// we can't interpolate tailwind classes, they might be missing in the bundle then
export const getTailwindXPadding = (paddingX: SizeType | 'remove', side: 'right' | 'left') => {
  switch (paddingX) {
    case 'remove':
      return side === 'right' ? 'pe-0' : 'ps-0'
    case 'xsmall':
      return side === 'right' ? 'pe-1' : 'ps-1'
    case 'small':
      return side === 'right' ? 'pe-2' : 'ps-2'
    case 'medium':
      return side === 'right' ? 'pe-4' : 'ps-4'
    case 'large':
      return side === 'right' ? 'pe-6' : 'ps-6'
    case 'xlarge':
      return side === 'right' ? 'pe-12' : 'ps-12'
    case 'xxlarge':
      return side === 'right' ? 'pe-24' : 'ps-24'
  }
}

export const extractCellProps = (field: FieldType): Record<string, string> => {
  return {
    ...(field?.alignH && { alignH: field.alignH }),
    ...(field?.alignV && { alignV: field.alignV }),
    ...(field?.width && { width: field.width }),
    class: undefined,
    wrap: undefined,
    style: undefined
  }
}
