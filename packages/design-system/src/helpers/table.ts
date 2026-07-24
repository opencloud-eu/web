import { FieldType, SizeType } from './types'

// we can't interpolate tailwind classes, they might be missing in the bundle then
export const getTailwindXPadding = (paddingX: SizeType | 'remove', side: 'right' | 'left') => {
  switch (paddingX) {
    case 'remove':
      return side === 'right' ? 'pr-0' : 'pl-0'
    case 'xsmall':
      return side === 'right' ? 'pr-1' : 'pl-1'
    case 'small':
      return side === 'right' ? 'pr-2' : 'pl-2'
    case 'medium':
      return side === 'right' ? 'pr-4' : 'pl-4'
    case 'large':
      return side === 'right' ? 'pr-6' : 'pl-6'
    case 'xlarge':
      return side === 'right' ? 'pr-12' : 'pl-12'
    case 'xxlarge':
      return side === 'right' ? 'pr-24' : 'pl-24'
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
