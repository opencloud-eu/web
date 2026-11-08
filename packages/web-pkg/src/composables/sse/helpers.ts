import { computed, unref } from 'vue'
import { sseEventSchema } from '@opencloud-eu/web-client/sse'
import { useAuthStore, useCapabilityStore } from '../piniaStores'

export function parseSseEventData(data: unknown) {
  if (typeof data !== 'string') {
    return null
  }
  try {
    const parsed = sseEventSchema.safeParse(JSON.parse(data))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/** Signed-in users and guests have an SSE stream, public links don't. */
export function useIsSseEnabled() {
  const capabilityStore = useCapabilityStore()
  const authStore = useAuthStore()

  return computed(
    () =>
      Boolean(unref(capabilityStore.supportSSE)) &&
      (Boolean(authStore.accessToken) || authStore.isGuestContext) &&
      !authStore.publicLinkContextReady
  )
}
