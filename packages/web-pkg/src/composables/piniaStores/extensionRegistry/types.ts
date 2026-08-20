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
  | 'vault'
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
 * Folder vault engine - the scheme-specific crypto a plugin implements.
 *
 * Its `encryptPath`/`decryptPath` operate on paths RELATIVE to the vault root
 * (e.g. `"sub/x"`); the engine never deals with the vault root in a path. The
 * vault root lives only on the `vaultRoot` field (identity), and the full-path
 * conversion is done once, generically, by `encryptVaultPath`/`decryptVaultPath`
 * (web-pkg helpers) - so callers with FULL clear-text paths use those, not the
 * engine's relative methods directly.
 *
 * A single resource name is just a one-segment relative path, so callers that
 * have a bare name (the activity feed, the upload pipeline) also go through
 * `encryptPath`/`decryptPath`. That only works because names must encrypt
 * **independently of their position** in the tree (a name's ciphertext can't
 * depend on its parent path) - the activity feed hands us a name with no path,
 * so position-dependent name encryption could never be decrypted there. The
 * engine still decides *how* it encrypts a multi-segment path internally
 * (rclone-crypt does it per segment), it just can't make a name's ciphertext
 * depend on where the name sits.
 */
export interface VaultEngine {
  /** Where this vault is rooted, for identity only (e.g. `/myvault.vault`, or `/` for a vault space or a share-rooted vault). */
  vaultRoot: string
  /** Encrypt a vault-root-RELATIVE clear-text path, e.g. `"sub/x"` or a bare name `"q1.txt"`. Full paths: use `encryptVaultPath`. */
  encryptPath: (relativePath: string) => Promise<string>
  /** Decrypt a vault-root-RELATIVE encrypted path (or a bare encrypted name). Full paths: use `decryptVaultPath`. */
  decryptPath: (relativePath: string) => Promise<string>
  /**
   * Pipe a stream of encrypted bytes through the engine and get back a
   * stream of cleartext bytes. The engine is free to process the input
   * chunk-by-chunk or to buffer everything internally - callers must not
   * rely on either behaviour.
   */
  decryptContent: (encrypted: ReadableStream<Uint8Array>) => ReadableStream<Uint8Array>
  /**
   * Symmetric counterpart to decryptContent: pipe cleartext through the
   * engine and get back the encrypted byte stream that should land on the
   * server.
   */
  encryptContent: (plaintext: ReadableStream<Uint8Array>) => ReadableStream<Uint8Array>
  /**
   * Mint an integrity token that commits the vault to this engine's key. The
   * token is opaque to callers - its format is the engine's business - but it
   * must be a string, since it gets stored as a WebDAV property on the vault
   * root and read back through `verifyIntegrityToken`.
   *
   * Callers write it exactly once, when a vault's passphrase is first set. Its
   * presence on the server is what makes the passphrase permanent.
   */
  createIntegrityToken: () => Promise<string>
  /**
   * Verify a passphrase against a token from `createIntegrityToken`. This is
   * the authoritative check: implementations should authenticate the token
   * cryptographically rather than guessing from the shape of the plaintext.
   */
  verifyIntegrityToken: (token: string) => Promise<boolean>
  /**
   * Fallback for vaults that carry no integrity token, either because they were
   * created outside OpenCloud Web (e.g. an rclone-managed vault).
   * Tries to decrypt a sample encrypted segment and returns true if the result
   * looks like cleartext, false if it errored out or produced garbage.
   *
   * Substantially weaker than `verifyIntegrityToken`: there is no authentication
   * tag, only a plausibility check on the decrypted bytes, and the segment's
   * plaintext is an arbitrary name the engine can't predict. A wrong passphrase
   * passes this check a low but non-negligible fraction of the time. Prefer the
   * token whenever one is available, and backfill one once this check has passed.
   *
   * Empty vaults can't be verified this way because there is no sample to decrypt.
   */
  verifySegment: (sampleEncryptedSegment: string) => Promise<boolean>
}

export interface VaultClaim {
  /** Clear-text root of the claimed vault (e.g. `/myvault.vault`). */
  vaultRoot: string
  /**
   * Whether this scheme encrypts resource *names* on the server (both file and
   * folder names - schemes that encrypt one but not the other don't exist in
   * practice, so this stays a single flag), not just their content.
   * rclone-crypt does; a content-only scheme would not. Lets sync, engine-free
   * callers decide things like "a search hit below the root is ciphertext
   * gibberish, drop it" without unlocking the vault. When false, names below
   * the root are clear text and behave like any other resource.
   */
  encryptsNames: boolean
  /**
   * Optional route the UI should navigate to in order to unlock the vault
   * (passphrase prompt, hardware-token flow, …). The route handler is
   * expected to populate the vault store and redirect back to
   * `query.redirectUrl` once it's done. If omitted, the vault is treated as
   * permanently locked from this layer's point of view.
   */
  unlockRoute?: RouteLocationNamedRaw
}

/**
 * Can be exposed by the extension's `setupComponent`. Used to commit whatever
 * locks a freshly created vault (a passphrase, a hardware token, …) after the
 * folder or space has been created on the server. For a vault space the
 * `vaultRoot` handed over is the space root.
 */
export type VaultFinalize = (space: SpaceResource, vaultRoot: string) => Promise<void>

/**
 * Everything an extension has to bring to let the UI create vaults with its
 * scheme. Optional as a whole on the extension: a scheme that can only read
 * existing vaults leaves it out.
 */
export interface VaultCreation {
  /**
   * Name extension a vault *folder* carries, without the leading dot, e.g.
   * `vault` for `Project archive.vault`.
   */
  vaultExtension: string
  /**
   * Content type a vault *space* carries in its `@libre.graph.contentType` drive
   * property, e.g. `application/vnd.opencloud.vault`.
   */
  vaultContentType: string
  /**
   * Component that collects and commits whatever this extension needs to lock a
   * newly created vault - a passphrase, a hardware token, … The generic layer
   * deliberately knows none of that, so the extension brings its own UI *and* its
   * own crypto here. Rendered as the second step of the create-folder/space flow.
   *
   * Contract:
   * - prop `vaultName`: cleartext name of the vault about to be created
   * - emits `update:valid` with whether its input is complete and usable
   * - exposes `finalize`, a `VaultFinalize` called once the folder or space
   *   exists on the server. Throwing leaves the vault without a committed secret,
   *   which the extension's unlock UI has to cope with anyway.
   */
  setupComponent: Component
}

export interface VaultExtension extends Extension {
  type: 'vault'
  /**
   * Resolve a vault engine for (space, path). Return null if this extension is
   * not responsible for the given location, or if it is but no usable
   * unlock state is available (the UI will surface this via claimsPath).
   *
   * Async on purpose: an engine may need to load and cache per-vault metadata
   * (e.g. an index/manifest file) before it can translate paths. rclone-crypt
   * resolves synchronously (passphrase-derived key) and just returns a
   * resolved promise. The cheap "is this a vault?" question stays synchronous
   * via `claimsPath`.
   */
  resolve: (space: SpaceResource, path: string) => Promise<VaultEngine | null>
  /**
   * Indicate whether this extension manages the given (space, path) at all,
   * regardless of unlock state. Lets the UI redirect a locked vault to the
   * extension-defined unlock UI even when `resolve` returns null.
   */
  claimsPath: (space: SpaceResource, path: string) => VaultClaim | null
  /**
   * What this extension needs to create new vaults. Optional, and its presence is
   * what tells the UI this extension can *create* vaults, and hence whether to
   * offer an encryption option when creating a folder or a space.
   */
  creation?: VaultCreation
}

export interface ResourceIndicatorExtension extends Extension {
  type: 'resourceIndicator'
  /**
   * Return zero or more status indicators for the resource. Return void/empty
   * if this extension does not want to render anything for it.
   */
  getResourceIndicators: (resource: Resource) => ResourceIndicator[] | void
}

export type ExtensionPoint<T extends Extension = Extension> = {
  id: string
  extensionType: ExtensionType
  multiple?: boolean
  defaultExtensionId?: string
  userPreference?: {
    label: string
    description?: string
  }
}
