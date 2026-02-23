import { Action } from '../../actions'
import { SearchProvider, SideBarPanel } from '../../../components'
import { AppNavigationItem } from '../../../apps'
import { Item } from '@opencloud-eu/web-client'
import { FolderView } from '../../../ui'
import { Component, Slot } from 'vue'
import { StringUnionOrAnyString } from '../../../utils'

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

export interface FloatingActionButtonExtension extends Extension {
  type: 'floatingActionButton'
  label: () => string
  isActive: () => boolean
  isDisabled?: () => boolean
  color?: string
  icon?: string
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
