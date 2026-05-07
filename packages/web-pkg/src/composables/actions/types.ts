import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import { RouteLocationRaw } from 'vue-router'
import { IconFillType } from '../../helpers'
import { AppearanceType } from '@opencloud-eu/design-system/helpers'

export type ActionOptions = Record<string, unknown | unknown[]>

type ActionCategory = 'primary' | 'secondary' | 'tertiary' | 'quaternary'

/**
 * Generic action interface.
 * When implementing actions on your own, it's recommended to use the `ActionMenuItem`
 * component from `web-pkg` to ensure the defaults are being set properly.
 */
export interface Action<T = ActionOptions> {
  /**
   * The unique name of the action. This is used for identifying it.
   */
  name: string
  /**
   * Determines where an action will be displayed in the resource context menu.
   * Doesn't have an effect on actions that are not shown in the context menu.
   *
   * Categories:
   * - primary: action will appear in primary action sections.
   * - secondary: action will appear in secondary action sections.
   * - tertiary: action will appear in tertiary action sections.
   * - quaternary:  action will appear in quaternary action sections.
   *
   * @default tertiary
   */
  category?: ActionCategory
  /**
   * The name of an icon from the OpenCloud icon set or a function
   * that returns the icon name based on the given options.
   */
  icon: string | ((options?: ActionOptions) => string)
  /**
   * Determines the fill type of the icon in the UI.
   * @default line
   */
  iconFillType?: IconFillType
  /**
   * The appearance of the action element in the UI.
   * @default raw
   */
  appearance?: AppearanceType
  /**
   * ID of the action, used as DOM selector.
   */
  id?: string
  /**
   * @deprecated this is unused.
   */
  img?: string
  /**
   * Additional CSS classes to apply to the action element in the UI.
   */
  class?: string
  /**
   * Setting this to true will make the action more prominent in the UI
   * as well as in the order for default actions.
   */
  hasPriority?: boolean
  /**
   * Setting this to true will hide the action label in the UI and only show the icon.
   */
  hideLabel?: boolean
  /**
   * Specify a shortcut label that will be shown in the UI.
   * This does not automatically register a keyboard shortcut for the action.
   */
  shortcut?: string
  /**
   * Setting this will call `stopPropagation()` on the click event.
   * @default false
   * @deprecated This should not be used anymore, as it can lead to unexpected behavior.
   */
  keepOpen?: boolean
  /**
   * External actions come first in the "New" context menu. Therefore, this flag only has
   * an effect for actions appearing in that menu.
   * @default false
   */
  isExternal?: boolean
  /**
   * This determines the file icon for the action in the "New" menu and will show as
   * file extension label.
   */
  ext?: string
  /**
   * The label of the action in the UI.
   * This can be a string or a function that returns a string based on the given options.
   */
  label(options?: T): string
  /**
   * Determines whether the action should be visible in the UI based on the given options.
   */
  isVisible(options?: T): boolean
  /**
   * Actions with a handler will be rendered as buttons in the UI.
   */
  handler?(options?: T): Promise<void> | void
  /**
   * Actions with a route will be rendered as anchor elements in the UI.
   * This is intended for internal links.
   */
  route?(options?: T): RouteLocationRaw | undefined
  /**
   * Actions with a href will be rendered as anchor elements in the UI.
   * This is intended for external links.
   */
  href?(options?: T): string
  /**
   * Determines whether the action should be disabled in the UI based on the given options.
   */
  isDisabled?(options?: T): boolean
  /**
   * If specified, this will show a tooltip with the given message when the action is disabled.
   */
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
