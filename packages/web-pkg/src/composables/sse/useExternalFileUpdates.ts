import { computed, onBeforeUnmount, toValue, unref, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { Resource } from '@opencloud-eu/web-client'
import { MESSAGE_TYPE, sseEventSchema } from '@opencloud-eu/web-client/sse'
import { useClientService } from '../clientService'
import { useAuthStore, useCapabilityStore } from '../piniaStores'

/** A write to the open file that did not come from this tab. */
export interface ExternalFileEvent {
  /** The etag the file carries after the write, as announced by the server. */
  etag: string
}

export interface ExternalFileUpdatesOptions {
  resource: MaybeRefOrGetter<Resource | undefined>
  /** The etag this client believes is on disk. */
  currentETag: MaybeRefOrGetter<string>
  /**
   * Whether an event may be handled right now. While false the newest event
   * waits and is delivered once this flips to true.
   */
  isActive: MaybeRefOrGetter<boolean>
  /** Handles one event. Runs one at a time; a newer event replaces a waiting one. */
  onExternalEvent: (event: ExternalFileEvent) => Promise<void>
}

/** SSE topics that mean the file body may have changed. */
const CONTENT_TOPICS = [MESSAGE_TYPE.POSTPROCESSING_FINISHED, MESSAGE_TYPE.FILE_TOUCHED]

function parseEventData(data: unknown) {
  if (typeof data !== 'string') return null
  try {
    const parsed = sseEventSchema.safeParse(JSON.parse(data))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/**
 * Listens for server-sent file events about one resource and hands the ones
 * that mean "someone else wrote this file" to the caller, one at a time.
 *
 * Only a signed-in user has an SSE stream.
 */
export function useExternalFileUpdates({
  resource,
  currentETag,
  isActive,
  onExternalEvent
}: ExternalFileUpdatesOptions) {
  const clientService = useClientService()
  const capabilityStore = useCapabilityStore()
  const authStore = useAuthStore()

  const isEnabled = computed(
    () =>
      Boolean(unref(capabilityStore.supportSSE)) &&
      Boolean(authStore.accessToken) &&
      !authStore.publicLinkContextReady
  )

  let pending: ExternalFileEvent | null = null
  let inFlight = false

  async function drain() {
    if (inFlight || !pending || !toValue(isActive)) return
    const event = pending
    pending = null
    inFlight = true
    try {
      await onExternalEvent(event)
    } catch (e) {
      console.error('[sse] handling an external file update failed:', e)
    } finally {
      inFlight = false
    }
    void drain()
  }

  function onMessage(msg: MessageEvent) {
    const data = parseEventData(msg.data)
    if (!data) return
    const current = toValue(resource)
    // The composite id all peers share; a share recipient's `id` differs.
    const fileId = current?.fileId ?? current?.id
    if (!fileId || data.itemid !== fileId) return
    // Our own PUT: the save path already applied its etag.
    if (data.initiatorid && data.initiatorid === clientService.initiatorId) return
    if (!data.etag || data.etag === toValue(currentETag)) return
    // Only the newest event is kept.
    pending = { etag: data.etag }
    void drain()
  }

  let stream: EventSource | null = null
  function subscribe() {
    if (stream) return
    stream = clientService.sseAuthenticated
    for (const topic of CONTENT_TOPICS) {
      stream.addEventListener(topic, onMessage)
    }
  }
  function unsubscribe() {
    if (!stream) return
    for (const topic of CONTENT_TOPICS) {
      stream.removeEventListener(topic, onMessage)
    }
    stream = null
  }

  watch(
    isEnabled,
    (enabled) => {
      if (enabled) subscribe()
      else unsubscribe()
    },
    { immediate: true }
  )
  watch(
    () => toValue(isActive),
    (active) => {
      if (active) void drain()
    }
  )
  watch(
    () => toValue(resource)?.id,
    () => {
      pending = null
    }
  )
  onBeforeUnmount(unsubscribe)
}
