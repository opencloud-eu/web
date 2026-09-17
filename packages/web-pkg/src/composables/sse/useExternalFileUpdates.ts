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
  /** Whether an event may be handled right now. Events arriving while false are dropped. */
  isActive: MaybeRefOrGetter<boolean>
  /**
   * Handles one event. Runs one at a time; an event arriving meanwhile runs
   * afterwards, and a newer one replaces it.
   */
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

  /** The event that arrived while a handler ran; only the newest is kept. */
  let pending: ExternalFileEvent | null = null
  let inFlight = false

  async function handle(event: ExternalFileEvent) {
    if (inFlight) {
      pending = event
      return
    }
    inFlight = true
    try {
      await onExternalEvent(event)
    } catch (e) {
      console.error('[sse] handling an external file update failed:', e)
    } finally {
      inFlight = false
    }
    const next = pending
    pending = null
    if (next && toValue(isActive)) void handle(next)
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
    // Both topics stat the file server-side, so the etag is always set.
    if (!data.etag || data.etag === toValue(currentETag)) return
    if (!toValue(isActive)) return
    void handle({ etag: data.etag })
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
    () => toValue(resource)?.id,
    () => {
      pending = null
    }
  )
  onBeforeUnmount(unsubscribe)
}
