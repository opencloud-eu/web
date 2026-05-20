import { Action } from '../../actions'
import { SearchProvider, SideBarPanel } from '../../../components'
import { AppNavigationItem, AppConfigObject } from '../../../apps'
import { Item, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { FolderView } from '../../../ui'
import { Component, Slot } from 'vue'
import { StringUnionOrAnyString } from '../../../utils'
import type {
  AppFileHandlingResult,
  AppFolderHandlingResult,
  FileContext,
  FileContentOptions,
  UrlForResourceOptions
} from '../../appDefaults'

export type ExtensionType = StringUnionOrAnyString<
  | 'action'
  | 'appMenuItem'
  | 'customComponent'
  | 'folderView'
  | 'search'
  | 'sidebarNav'
  | 'sidebarPanel'
  | 'accountExtension'
  | 'floatingActionButton'
  | 'resourceEditor'
>

export type Extension = {
  id: string
  type: ExtensionType
  extensionPointIds?: string[]
  userPreference?: {
    optionLabel?: string
  }
}

export interface ActionExtension extends Extension {
  type: 'action'
  action: Action
}

export interface SearchExtension extends Extension {
  type: 'search'
  searchProvider: SearchProvider
}

export interface SidebarNavExtension extends Extension {
  type: 'sidebarNav'
  navItem: AppNavigationItem
}

export interface SidebarPanelExtension<
  R extends Item,
  P extends Item,
  T extends Item
> extends Extension {
  type: 'sidebarPanel'
  panel: SideBarPanel<R, P, T>
}

export interface FolderViewExtension extends Extension {
  type: 'folderView'
  folderView: FolderView
}

export interface CustomComponentExtension extends Extension {
  type: 'customComponent'
  content: Slot | Component
  componentProps?: () => Record<string, unknown>
}

export interface AccountExtension extends Extension {
  type: 'accountExtension'
  content: Slot | Component
  label: () => string
  icon: string
}

export type FloatingActionButtonExtensionMode = 'drop' | 'handler'

export interface FloatingActionButtonExtension extends Extension {
  type: 'floatingActionButton'
  label: () => string
  isVisible?: () => boolean
  isDisabled?: () => boolean
  color?: string
  icon?: string
  mode: () => FloatingActionButtonExtensionMode
  handler?: () => Promise<void> | void
  dropComponent?: Component
}

export interface AppMenuItemExtension extends Extension {
  type: 'appMenuItem'
  label: () => string
  color?: string
  handler?: () => Promise<void> | void
  icon?: string
  path?: string
  priority?: number
  url?: string
}

/**
 * The full set of bindings a resourceEditor component can receive from
 * useResourceEditor. A component opts in to capabilities by declaring the
 * matching prop/emit — e.g. declaring a `url` prop tells useResourceEditor
 * to resolve getUrlForResource; declaring an `update:currentContent` emit
 * marks the component as an editor (vs. viewer) and engages the save /
 * dirty-tracking / autosave path.
 *
 * Every binding is typed optional here because it reflects the host's actual
 * runtime contract: `resource`, `space`, `applicationConfig`,
 * `currentFileContext` are guaranteed once `loading` resolves, but components
 * that own their own resource loading (declaring `update:resource`) see them
 * undefined initially. Components that *know* the host always provides a
 * value when they render (a viewer behind the route's LoadingScreen) are
 * free to declare their props strict (`url: string`) instead of `Pick<…>` —
 * Vue's prop typing is covariant so it still assigns to
 * {@link ResourceEditorComponent}.
 */
export interface ResourceEditorBindings {
  resource?: Resource
  space?: SpaceResource
  isReadOnly?: boolean
  applicationConfig?: AppConfigObject
  currentFileContext?: FileContext

  url?: string
  currentContent?: unknown
  activeFiles?: Resource[]
  isDirty?: boolean
  isFolderLoading?: boolean

  // Method-shaped bindings (forwarded so apps don't need their own clientService wiring)
  loadFolderForFileContext?: AppFolderHandlingResult['loadFolderForFileContext']
  getUrlForResource?: AppFileHandlingResult['getUrlForResource']
  revokeUrl?: AppFileHandlingResult['revokeUrl']

  // Method-shorthand syntax (vs property arrow) is used here so TypeScript
  // applies bivariant parameter checking to these callback bindings — apps
  // declare emits whose handler signature varies slightly (e.g. preview's
  // `register:onDeleteResourceCallback` takes a `() => Promise<void>` rather
  // than the looser `() => Promise<void> | void` we'd otherwise enforce).
  'onUpdate:currentContent'?(value: unknown): void
  'onUpdate:resource'?(resource: Resource): void
  'onRegister:onDeleteResourceCallback'?(callback: () => Promise<void> | void): void
  'onDelete:resource'?(): void
  onSave?(): Promise<void> | void
  onClose?(): void
}

export type ResourceEditorComponent = Component<ResourceEditorBindings>

export interface ResourceEditorExtension extends Extension {
  type: 'resourceEditor'
  /**
   * Stable identifier passed to useAppDefaults as applicationId. Typically
   * matches the app's appInfo.id (e.g. 'text-editor', 'pdf-viewer'). For
   * extensions that expose multiple editor variants within one app, use a
   * dotted suffix (e.g. 'preview.image').
   */
  appId: string

  component: ResourceEditorComponent

  urlForResourceOptions?: UrlForResourceOptions
  fileContentOptions?: FileContentOptions
  disableAutoSave?: boolean
  fileSizeLimit?: number
  importResourceWithExtension?: (resource: Resource) => string | null
}

export type ExtensionPoint<T extends Extension> = {
  id: string
  extensionType: ExtensionType
  multiple?: boolean
  defaultExtensionId?: string
  userPreference?: {
    label: string
    description?: string
  }
}
