const sizeClassMappings = {
  xxxsmall: 'xxxs',
  xxsmall: 'xxs',
  xsmall: 'xs',
  small: 's',
  medium: 'm',
  large: 'l',
  xlarge: 'xl',
  xxlarge: 'xxl',
  xxxlarge: 'xxxl',
  remove: 'rm'
}

export function getSizeClass(size: string) {
  return sizeClassMappings[size as keyof typeof sizeClassMappings]
}

const tailwindSizeClassMappings = {
  xsmall: '1',
  small: '2',
  medium: '4',
  large: '6',
  xlarge: '12',
  xxlarge: '24',
  remove: '0'
}

export function getTailwindSizeClass(size: string) {
  return tailwindSizeClassMappings[size as keyof typeof tailwindSizeClassMappings]
}
