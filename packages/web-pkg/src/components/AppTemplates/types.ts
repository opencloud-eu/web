import { Resource } from '@opencloud-eu/web-client'
import { AppConfigObject } from '../../apps/types'
import { Ref } from 'vue'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import type { CollaborativeAdapter } from '../../composables'

/**
 * Handed to {@link CollaborativeOptions.makeAdapter}. Reactive, because the
 * adapter is built during the wrapper's setup — before the file is loaded.
 */
export interface CollaborativeAdapterContext {
  /** The file. Undefined until the wrapper has loaded it, so read it lazily. */
  resource: Ref<Resource>
}

export interface CollaborativeOptions {
  /**
   * App version owned by the consuming app — typically `pkg.version` from its
   * own package.json. Peers in the same room must agree on it, otherwise the
   * older client is locked out and asked to reload.
   */
  appVersion: string
  /**
   * Builds the bridge between the native file format and the shared Y.Doc.
   * Called once during the wrapper's setup, so it may use composables.
   */
  makeAdapter: (context: CollaborativeAdapterContext) => CollaborativeAdapter
  /**
   * Namespace for the collab room. Defaults to the `applicationId`. Editors
   * with incompatible Y.Doc schemas must not share a room, so only override
   * this when two apps deliberately use the same shared-type layout.
   */
  documentPrefix?: string
}

export interface AppWrapperSlotArgs {
  applicationConfig: AppConfigObject
  resource: Resource
  currentContent: Ref<string>
  isDirty: boolean
  isReadOnly: boolean
  url: string
  /** Set once the collaborative session is synced and hydrated, else null. */
  ydoc: Y.Doc | null
  /** Set once the collaborative session is synced and hydrated, else null. */
  awareness: Awareness | null
}
