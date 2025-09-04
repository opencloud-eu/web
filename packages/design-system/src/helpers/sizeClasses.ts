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

/** @deprecated use Tailwind classes instead */
export function getSizeClass(size: string) {
  return sizeClassMappings[size as keyof typeof sizeClassMappings]
}
