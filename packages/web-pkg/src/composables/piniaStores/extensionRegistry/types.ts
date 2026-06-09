import { Action } from '../../actions'
import { SearchProvider, SideBarPanel } from '../../../components'
import { AppNavigationItem } from '../../../apps'
import { Item, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { FolderView } from '../../../ui'
import { Component, Slot } from 'vue'
import { RouteLocationNamedRaw } from 'vue-router'
import { StringUnionOrAnyString } from '../../../utils'
import type { ResourceIndicator } from '../../resources/useResourceIndicators'

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
  | 'folderVault'
  | 'resourceIndicator'
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
 * Folder vault engine. Implementations decrypt resource names that come back
 * from the server and encrypt clear-text paths that are sent to the server.
 */
export interface FolderVaultEngine {
  /** Translate a clear-text path into its server-side encrypted form. */
  encryptPath: (clearPath: string) => Promise<string>
  /** Translate a server-side encrypted path back into its clear-text form. */
  decryptPath: (encryptedPath: string) => Promise<string>
  /** Decrypt a single path segment (e.g. a Resource.name). */
  decryptName: (encryptedSegment: string, parentClearPath: string) => Promise<string>
  /** Encrypt a single cleartext segment to its on-server form. */
  encryptName: (clearSegment: string, parentClearPath: string) => Promise<string>
  /**
   * Pipe a stream of encrypted bytes through the engine and get back a
   * stream of cleartext bytes. The engine is free to process the input
   * chunk-by-chunk or to buffer everything internally — callers must not
   * rely on either behaviour.
   */
  decryptContent: (encrypted: ReadableStream<Uint8Array>) => ReadableStream<Uint8Array>
  /**
   * Symmetric counterpart to decryptContent: pipe cleartext through the
   * engine and get back the encrypted byte stream that should land on the
   * server.
   */
  encryptContent: (plaintext: ReadableStream<Uint8Array>) => ReadableStream<Uint8Array>
  /** Clear-text path of the vault root, e.g. `/myvault.vault`. */
  vaultRoot: string
  /** Whether the vault is currently locked. PoC: always false. */
  isLocked: () => boolean
  /**
   * Try to decrypt a sample encrypted segment to verify the key actually
   * matches the data on the server. Returns true if the decryption looks
   * like cleartext, false if it errored out or produced garbage.
   * Empty vaults can't be verified — callers should treat that case as
   * "trust the key" since there's nothing to disagree with yet.
   */
  verifyKey: (sampleEncryptedSegment: string) => Promise<boolean>
}

export interface FolderVaultClaim {
  /** Clear-text root of the claimed vault (e.g. `/myvault.vault`). */
  vaultRoot: string
  /**
   * Optional route the UI should navigate to in order to unlock the vault
   * (passphrase prompt, hardware-token flow, …). The route handler is
   * expected to populate the folder-vault store and redirect back to
   * `query.redirectUrl` once it's done. If omitted, the vault is treated as
   * permanently locked from this layer's point of view.
   */
  unlockRoute?: RouteLocationNamedRaw
}

export interface FolderVaultExtension extends Extension {
  type: 'folderVault'
  /**
   * Resolve a vault engine for (space, path). Return null if this extension is
   * not responsible for the given location, or if it is but no usable
   * unlock state is available (the UI will surface this via claimsPath).
   */
  resolve: (space: SpaceResource, path: string) => FolderVaultEngine | null
  /**
   * Indicate whether this extension manages the given (space, path) at all,
   * regardless of unlock state. Lets the UI redirect a locked vault to the
   * extension-defined unlock UI even when `resolve` returns null.
   */
  claimsPath: (space: SpaceResource, path: string) => FolderVaultClaim | null
}

export interface ResourceIndicatorExtension extends Extension {
  type: 'resourceIndicator'
  /**
   * Return zero or more status indicators for the resource. Return void/empty
   * if this extension does not want to render anything for it.
   */
  getResourceIndicators: (resource: Resource) => ResourceIndicator[] | void
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
