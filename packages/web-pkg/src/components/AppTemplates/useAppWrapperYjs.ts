import { computed, unref, watch } from 'vue'
import type { Ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { call } from '@opencloud-eu/web-client'
import type { Resource } from '@opencloud-eu/web-client'
import { useMessages, useYjsSession } from '../../composables'
import type { AppFileHandlingResult, FileContentOptions, FileContext } from '../../composables'
import type { YjsOptions } from './types'

export interface AppWrapperYjsOptions {
  /** Null when the app did not opt into collaborative editing. */
  yjs: YjsOptions | null
  applicationId: string
  resource: Ref<Resource>
  isReadOnly: Ref<boolean>
  loading: Ref<boolean>
  loadingError: Ref<Error>
  contentResourceId: Ref<string | undefined>
  currentContent: Ref<unknown>
  serverContent: Ref<unknown>
  currentETag: Ref<string>
  currentFileContext: Ref<FileContext>
  fileContentOptions: FileContentOptions | null
  getFileContents: AppFileHandlingResult['getFileContents']
  putFileContents: AppFileHandlingResult['putFileContents']
  /** AppWrapper's landing point for a successful write. */
  applySavedResource: (etag: string, saved?: Resource | null) => void
}

/**
 * Everything Yjs-specific that AppWrapper owns on behalf of collaborative
 * apps: the session with its wiring into the wrapper's save state, the
 * collaboration error toast, and the save-conflict reconciliation.
 */
export function useAppWrapperYjs(options: AppWrapperYjsOptions) {
  const {
    yjs,
    applicationId,
    resource,
    isReadOnly,
    loading,
    loadingError,
    contentResourceId,
    currentContent,
    serverContent,
    currentETag,
    currentFileContext,
    fileContentOptions,
    getFileContents,
    putFileContents,
    applySavedResource
  } = options

  const { $gettext } = useGettext()
  const { showErrorMessage } = useMessages()

  const session = yjs
    ? useYjsSession({
        resource,
        currentContent: () => (unref(currentContent) as string) ?? '',
        // Hydration seeds the Y.Doc from `currentContent`, so hold the
        // session back until the body was fetched for this very resource.
        enabled: () =>
          !unref(loading) &&
          !unref(loadingError) &&
          unref(contentResourceId) === unref(resource)?.id,
        isReadOnly,
        adapter: yjs.makeAdapter({ resource }),
        documentPrefix: yjs.documentPrefix ?? applicationId,
        onContentChange: (value) => {
          currentContent.value = value
        },
        // A peer saved: this content is what's on disk now, so `isDirty`
        // drops back to false without a WebDAV round-trip.
        onServerContentChange: (value) => {
          serverContent.value = value
        },
        // A peer saved: its fresh etag keeps our next PUT's `If-Match`
        // correct.
        onEtagChange: (value) => {
          if (unref(currentETag) === value) return
          currentETag.value = value
          // Mirror into `resource.etag` too: the session compares it against
          // the room's etag to detect external writes, and a peer that never
          // saves itself would otherwise read the next reconnect as one and
          // wipe the room to "recover" it.
          resource.value = { ...unref(resource), etag: value }
        }
      })
    : null

  if (session) {
    watch(session.error, (error) => {
      if (!error) return
      showErrorMessage({ title: $gettext('Collaboration error'), desc: error.message })
    })
  }

  /** True once the session is synced and hydrated; always true without one. */
  const isSessionReady = computed(() => !session || unref(session.isReady))

  // A Yjs session can force read-only on top of the WebDAV permissions.
  const effectiveReadOnly = computed(
    () => unref(isReadOnly) || Boolean(unref(session?.isLockedForReload))
  )

  /**
   * Tries to resolve a 409/412 save conflict without user interaction: the
   * most likely cause inside a connected session is a peer's save, which our
   * Y.Doc has already merged. Returns true when reconciled (and the save
   * state updated), false when the caller must surface the conflict.
   */
  // TNext must be `any`: the delegated `call()` generators expect different
  // resume types, which would otherwise intersect to `never`.
  function* reconcileConflict(newContent: unknown): Generator<unknown, boolean, any> {
    if (!session || unref(session.status) !== 'connected') return false
    try {
      const fresh = yield* call(getFileContents(currentFileContext, { ...fileContentOptions }))
      const freshEtag = fresh.headers['OC-ETag']

      if (fresh.body === newContent) {
        // Same content, only our etag tracking was stale: reconcile silently.
        serverContent.value = newContent
        applySavedResource(freshEtag)
        return true
      }

      // Someone wrote the file. Only this room's own writes may be
      // republished over: a write from outside the room never reached this
      // document, and retrying would destroy it unseen.
      const writtenByRoom = yield* call(session.wasWrittenByRoom(freshEtag))
      if (!writtenByRoom) return false

      // Retry with the merged state, not `newContent`: that snapshot predates
      // the peer save that caused this conflict, so writing it again would
      // drop exactly the edits the peer just committed.
      const mergedContent = yield* call(session.serializeMerged())
      const retryContent = mergedContent ?? newContent
      const retry = yield* call(
        putFileContents(currentFileContext, {
          content: retryContent as string | ArrayBuffer,
          previousEntityTag: freshEtag
        })
      )
      // Both sides: leaving `currentContent` on the pre-conflict snapshot
      // would read as an unsaved change and put the older body back on the
      // next autosave. A pending serialize overwrites this with an equal or
      // newer value.
      serverContent.value = currentContent.value = retryContent
      applySavedResource(retry.etag, retry)
      return true
    } catch (retryErr) {
      // Fall through to the conflict popup so the user can still recover by
      // copying out.
      console.error('[yjs] conflict reconciliation failed:', retryErr)
      return false
    }
  }

  return { session, isSessionReady, effectiveReadOnly, reconcileConflict }
}
