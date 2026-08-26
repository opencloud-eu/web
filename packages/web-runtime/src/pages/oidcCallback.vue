<template>
  <plain-card
    v-if="error"
    class="w-full max-w-md"
    :title="$gettext('Authentication failed')"
    :description="$gettext('Please contact the administrator if this error persists.')"
    icon="error-warning"
  />
  <app-loading-spinner v-else />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, unref } from 'vue'
import { useEmbedMode, useRoute, AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth'
import { useGettext } from 'vue3-gettext'
import PlainCard from '../components/PlainCard.vue'

const { $gettext } = useGettext()

const { isDelegatingAuthentication, postMessage, verifyDelegatedAuthenticationOrigin } =
  useEmbedMode()

const error = ref(false)

const route = useRoute()

const handleRequestedTokenEvent = (event: MessageEvent): void => {
  if (verifyDelegatedAuthenticationOrigin(event.origin) === false) {
    return
  }

  if (event.data?.name !== 'opencloud-embed:update-token') {
    return
  }

  console.debug('[page:oidcCallback:handleRequestedTokenEvent] - received delegated access_token')
  authService.signInCallback(event.data.data.access_token, event.data.data.session_id)
}

onMounted(() => {
  if (unref(route).query.error) {
    error.value = true
    console.warn(
      `OAuth error: ${unref(route).query.error} - ${unref(route).query.error_description}`
    )
    return
  }

  if (unref(isDelegatingAuthentication)) {
    console.debug('[page:oidcCallback:hook:mounted] - adding update-token event listener')
    window.addEventListener('message', handleRequestedTokenEvent)
    console.debug('[page:oidcCallback:hook:mounted] - requesting delegated access_token')
    postMessage<void>('opencloud-embed:request-token')

    return
  }

  authService.signInCallback()
})

onBeforeUnmount(() => {
  if (!unref(isDelegatingAuthentication)) {
    return
  }

  console.debug('[page:oidcCallback:hook:beforeUnmount] - removing update-token event listener')
  window.removeEventListener('message', handleRequestedTokenEvent)
})
</script>
