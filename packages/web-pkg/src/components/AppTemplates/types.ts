import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { AppConfigObject } from '../../apps/types'
import { Ref } from 'vue'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import type { YjsStatus } from '../../composables/yjs'
import type {
  AppFileHandlingResult,
  AppFolderHandlingResult,
  YjsAdapter,
  FileContext
} from '../../composables'

/**
 * Handed to {@link YjsOptions.makeAdapter}. Reactive, because the
 * adapter is built during the wrapper's setup before the file is loaded.
 */
export interface YjsAdapterContext {
  /** The file. Undefined until the wrapper has loaded it, so read it lazily. */
  resource: Ref<Resource>
}

export interface YjsOptions {
  /**
   * Builds the bridge between the native file format and the shared Y.Doc.
   * Called once during the wrapper's setup, so it may use composables.
   */
  makeAdapter: (context: YjsAdapterContext) => YjsAdapter
  /**
   * Namespace for the Yjs room. Defaults to the `applicationId`. Editors
   * with incompatible Y.Doc schemas must not share a room, so only override
   * this when two apps deliberately use the same shared-type layout.
   */
  documentPrefix?: string
}

/**
 * Every value AppWrapper passes down to the wrapped component.
 *
 * A wrapped component must declare only the subset it actually uses: AppWrapper
 * inspects the component's props to decide what to load. Use one of the presets
 * below, or `Pick` the keys you need.
 */
export interface AppWrapperSlotProps {
  applicationConfig: AppConfigObject
  space: SpaceResource
  resource: Resource
  currentFileContext: FileContext
  /** Fetching this costs a WebDAV GET of the whole file. */
  currentContent: string
  /** Building this costs a WebDAV GET of the whole file. */
  url: string
  isDirty: boolean
  isReadOnly: boolean
  activeFiles: Resource[]
  isFolderLoading: boolean
  /** Set once the Yjs session is synced and hydrated, else null. */
  ydoc: Y.Doc | null
  /** Set once the Yjs session is synced and hydrated, else null. */
  awareness: Awareness | null
  /**
   * Current collaboration transport status. Null when the wrapped app did not
   * opt into Yjs.
   */
  yjsStatus: YjsStatus | null
}

/**
 * Callbacks AppWrapper passes down alongside {@link AppWrapperSlotProps}. The
 * `on*` keys arrive as listeners, so a wrapped component declares them via
 * `defineEmits` rather than `defineProps`.
 */
export interface AppWrapperSlotHandlers {
  loadFolderForFileContext: AppFolderHandlingResult['loadFolderForFileContext']
  getUrlForResource: AppFileHandlingResult['getUrlForResource']
  revokeUrl: AppFileHandlingResult['revokeUrl']
  onSave: () => Promise<void>
  onClose: () => void
  'onUpdate:resource': (value: Resource) => void
  'onUpdate:currentContent': (value: unknown) => void
  'onRegister:onDeleteResourceCallback': (value: () => void) => void
  'onDelete:resource': () => void
}

/** Apps that render the file body and write it back. */
export type EditorSlotProps = Pick<
  AppWrapperSlotProps,
  'resource' | 'currentContent' | 'isReadOnly'
>

/** Editors opting into collaborative editing via {@link YjsOptions}. */
export type YjsEditorSlotProps = EditorSlotProps &
  Pick<AppWrapperSlotProps, 'ydoc' | 'awareness' | 'yjsStatus'>

/** Apps that render the file from a URL instead of its body. */
export type ViewerSlotProps = Pick<AppWrapperSlotProps, 'resource' | 'url'>

/** Apps that browse the whole folder and build their own URLs per file. */
export type FolderViewerSlotProps = Pick<
  AppWrapperSlotProps,
  'currentFileContext' | 'activeFiles' | 'isFolderLoading'
> &
  Pick<AppWrapperSlotHandlers, 'loadFolderForFileContext' | 'getUrlForResource' | 'revokeUrl'>
