<template>
  <div class="oc-login-card oc-position-center">
    <img class="oc-login-logo" :src="logoImg" alt="" :aria-hidden="true" />
    <div v-show="error" class="oc-login-card-body p-6">
      <h2 v-translate class="oc-login-card-title">Authentication failed</h2>
      <p v-translate>Please contact the administrator if this error persists.</p>
    </div>
    <div v-show="!error" class="oc-login-card-body">
      <h3 v-translate class="oc-login-card-title">Logging you in</h3>
      <p v-translate>Please wait, you are being redirected.</p>
    </div>
    <div class="oc-login-card-footer pt-0">
      <p>{{ footerSlogan }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, unref } from 'vue'
import { useEmbedMode, useRoute, useThemeStore } from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'OidcCallbackPage',
  setup() {
    const themeStore = useThemeStore()
    const { currentTheme } = storeToRefs(themeStore)

    const { isDelegatingAuthentication, postMessage, verifyDelegatedAuthenticationOrigin } =
      useEmbedMode()

    const error = ref(false)

    const footerSlogan = computed(() => unref(currentTheme)?.slogan)
    const logoImg = computed(() => unref(currentTheme)?.logo)

    const route = useRoute()

    const handleRequestedTokenEvent = (event: MessageEvent): void => {
      if (verifyDelegatedAuthenticationOrigin(event.origin) === false) {
        return
      }

      if (event.data?.name !== 'opencloud-embed:update-token') {
        return
      }

      console.debug(
        '[page:oidcCallback:handleRequestedTokenEvent] - received delegated access_token'
      )
      authService.signInCallback(event.data.data.access_token)
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

      if (unref(route).path === '/web-oidc-silent-redirect') {
        authService.signInSilentCallback()
      } else {
        authService.signInCallback()
      }
    })

    onBeforeUnmount(() => {
      if (!unref(isDelegatingAuthentication)) {
        return
      }

      console.debug('[page:oidcCallback:hook:beforeUnmount] - removing update-token event listener')
      window.removeEventListener('message', handleRequestedTokenEvent)
    })

    return {
      error,
      logoImg,
      footerSlogan
    }
  }
})
</script>
