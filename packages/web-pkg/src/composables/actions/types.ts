import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import { RouteLocationRaw } from 'vue-router'
import { IconFillType } from '../../helpers'
import { AppearanceType } from '@opencloud-eu/design-system/helpers'

export type ActionOptions = Record<string, unknown | unknown[]>

type ActionCategory = 'actions' | 'context' | 'share' | 'sidebar'

export interface Action<T = ActionOptions> {
  name: string
  /**
   * Determines where an action will be displayed in the resource context menu.
   *
   * - actions: action will appear in the "actions" section of the resource context menu.
   * - context: action will appear in the "Open with..."-menu of the resource context menu.
   *   It will also be the default when no other action is available for the given file type.
   * - share: action will appear in the "shares" section of the resource context menu.
   * - sidebar: action will appear in the "sidebar" section of the resource context menu.
   *
   * @default actions
   */
  category?: ActionCategory
  icon: string | ((options?: ActionOptions) => string)
  iconFillType?: IconFillType
  appearance?: AppearanceType
  id?: string
  img?: string
  class?: string
  hasPriority?: boolean
  hideLabel?: boolean
  shortcut?: string
  keepOpen?: boolean
  isExternal?: boolean
  ext?: string

  label(options?: T): string

  isVisible(options?: T): boolean

  // componentType: button
  handler?(options?: T): Promise<void> | void

  // componentType: router-link
  route?(options?: T): RouteLocationRaw | undefined

  // componentType: a
  href?(options?: T): string

  // can be used to display the action in a disabled state in the UI
  isDisabled?(options?: T): boolean

  disabledTooltip?(options?: T): string
}

export type FileActionOptions<T extends Resource = Resource> = {
  space: SpaceResource
  resources?: T[]
}
export type FileAction<T extends Resource = Resource> = Action<FileActionOptions<T>>

export type GroupActionOptions = {
  resources: Group[]
}
export type GroupAction = Action<GroupActionOptions>

export type SpaceActionOptions = {
  resources?: SpaceResource[]
}
export type SpaceAction = Action<SpaceActionOptions>

export type UserActionOptions = {
  resources: User[]
}
export type UserAction = Action<UserActionOptions>
