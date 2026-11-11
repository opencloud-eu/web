import { onBeforeUnmount, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { extractNodeId, extractStorageId } from '@opencloud-eu/web-client'
import { MESSAGE_TYPE } from '@opencloud-eu/web-client/sse'
import { useClientService } from '../clientService'
import { parseSseEventData, useIsSseEnabled } from './helpers'

export interface ExternalShareUpdatesOptions {
  /** The file ids of the items whose shares are shown, e.g. a file and its parent folders. */
  itemIds: MaybeRefOrGetter<string[]>
  /**
   * Called when another client created, changed or removed a share or link of one of the items.
   * A burst of events, e.g. when sharing with several users at once, results in a single call.
   */
  onExternalShareUpdate: () => void
}

/** Time in ms after the last event of a burst until the update. */
const UPDATE_DELAY = 300

const SHARE_TOPICS = [
  MESSAGE_TYPE.SHARE_CREATED,
  MESSAGE_TYPE.SHARE_UPDATED,
  MESSAGE_TYPE.SHARE_REMOVED,
  MESSAGE_TYPE.LINK_CREATED,
  MESSAGE_TYPE.LINK_UPDATED,
  MESSAGE_TYPE.LINK_REMOVED
]

/**
 * The server addresses a space root as `<storage>$<space>!<space>`,
 * web as `<storage>$<space>`, hence a space root matches both.
 */
function getMatchingItemIds(itemId: string) {
  const storageId = extractStorageId(itemId)
  if (storageId && storageId.split('$')[1] === extractNodeId(itemId)) {
    return [itemId, storageId]
  }
  return [itemId]
}

/**
 * Listens for server-sent share and link events about the given items
 * that did not come from this tab.
 */
export function useExternalShareUpdates({
  itemIds,
  onExternalShareUpdate
}: ExternalShareUpdatesOptions) {
  const clientService = useClientService()
  const isEnabled = useIsSseEnabled()

  /** The shown items that changed since the last update. */
  const pendingItemIds = new Set<string>()

  function update() {
    const shownItemIds = toValue(itemIds)
    const isStillShown = [...pendingItemIds].some((id) => shownItemIds.includes(id))
    pendingItemIds.clear()
    if (!isStillShown) {
      // the shown items changed meanwhile
      return
    }
    onExternalShareUpdate()
  }
  const debouncedUpdate = useDebounceFn(update, UPDATE_DELAY)

  function scheduleUpdate(changedItemIds: string[]) {
    for (const id of changedItemIds) {
      pendingItemIds.add(id)
    }
    debouncedUpdate()
  }
  function cancelUpdate() {
    debouncedUpdate.cancel()
    pendingItemIds.clear()
  }

  function onMessage(msg: MessageEvent) {
    const data = parseSseEventData(msg.data)
    if (!data?.itemid) {
      return
    }
    if (data.initiatorid && data.initiatorid === clientService.initiatorId) {
      // this tab already updated the shares itself
      return
    }
    const shownItemIds = toValue(itemIds)
    const changedItemIds = getMatchingItemIds(data.itemid).filter((id) => shownItemIds.includes(id))
    if (!changedItemIds.length) {
      return
    }
    scheduleUpdate(changedItemIds)
  }

  let stream: EventSource | null = null
  function subscribe() {
    if (stream) {
      return
    }
    stream = clientService.sseAuthenticated
    for (const topic of SHARE_TOPICS) {
      stream.addEventListener(topic, onMessage)
    }
  }
  function unsubscribe() {
    if (!stream) {
      return
    }
    for (const topic of SHARE_TOPICS) {
      stream.removeEventListener(topic, onMessage)
    }
    stream = null
    cancelUpdate()
  }

  watch(
    isEnabled,
    (enabled) => {
      if (enabled) {
        subscribe()
        return
      }
      unsubscribe()
    },
    { immediate: true }
  )
  onBeforeUnmount(unsubscribe)
}
