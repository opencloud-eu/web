import { computed, ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useEventListener } from '@vueuse/core'
import { urlJoin } from '@opencloud-eu/web-client'
import { useAuthStore, useClientService, useConfigStore } from '@opencloud-eu/web-pkg'

/*
 * 'unknown' when the IDP offers two-factor authentication but there is no session at the
 * IDP to ask with. Its page then asks to log in.
 */
export type TwoFactorState = 'on' | 'off' | 'unknown'

/*
 * Two-factor authentication is a feature of the builtin IDP. Users turn it on and off on a
 * page of the IDP, the state is requested with the session of the IDP. The state is null
 * while it is loading and when the IDP does not offer it, e.g. when an external IDP is used.
 */
export const useTwoFactorAuthentication = () => {
  const authStore = useAuthStore()
  const clientService = useClientService()
  const configStore = useConfigStore()

  const state = ref<TwoFactorState | null>(null)
  const pageUrl = computed(() => urlJoin(configStore.serverUrl, 'signin/v1/mfa'))

  const loadStateTask = useTask(function* (signal) {
    try {
      const { status, data } = yield clientService.httpUnAuthenticated.get<{ enabled: boolean }>(
        urlJoin(configStore.serverUrl, 'signin/v1/identifier/_/mfa/status'),
        { headers: { 'Kopano-Konnect-XSRF': '1' }, validateStatus: () => true, signal }
      )
      if (status === 200) {
        state.value = data?.enabled ? 'on' : 'off'
        return
      }
      state.value = status === 401 ? 'unknown' : null
    } catch (e) {
      console.error(e)
      state.value = null
    }
  }).restartable()

  // The state does not change here. Turning two-factor authentication on needs an
  // authenticator app to be set up, turning it off needs a code. Both happen on the page of
  // the IDP, which opens in another tab, and the state is loaded again when the user is back.
  function openPage() {
    window.open(unref(pageUrl), '_blank', 'noopener')
  }

  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible' && authStore.userContextReady) {
      loadStateTask.perform()
    }
  })

  return { state, pageUrl, loadStateTask, openPage }
}
