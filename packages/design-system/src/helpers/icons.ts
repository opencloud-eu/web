import { FillType } from './types'

let iconUrlPrefix = ''

export const setIconUrlPrefix = (prefix: string) => {
  iconUrlPrefix = prefix
}

export const getIconUrlPrefix = () => {
  return iconUrlPrefix
}

export type NamedIcon = {
  name: string
  fillType?: FillType
  color?: string
  src?: never
  srcDark?: never
}

export type ImageIcon = {
  src: string
  srcDark?: string
  name?: never
  fillType?: never
  color?: never
}

/**
 * An icon as apps, extensions and components pass it around: the name of an icon from the icon
 * set, a named icon or an image icon. A string is always a name. A named icon carries its own
 * `fillType` and `color`, which take precedence over what the rendering component would use.
 * An image icon is rendered as an image and has neither. Its `srcDark` is used in dark mode.
 */
export type Icon = string | NamedIcon | ImageIcon

export function isImageIcon(icon: Icon | undefined): icon is ImageIcon {
  return typeof icon === 'object' && icon !== null && typeof icon.src === 'string'
}

export const iconIsDarkInjectionKey = 'oc-icon-is-dark'
