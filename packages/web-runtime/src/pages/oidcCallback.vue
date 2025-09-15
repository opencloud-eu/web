<template>
  <div class="h-screen flex flex-col justify-center items-center">
    <oc-card
      :logo-url="logoImg"
      :title="cardTitle"
      body-class="w-sm text-center"
      class="bg-role-surface-container rounded-lg"
    >
      <p v-text="cardHint" />
      <template #footer>
        <p v-text="footerSlogan" />
      </template>
    </oc-card>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, unref } from 'vue'
import { useEmbedMode, useRoute, useThemeStore } from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'OidcCallbackPage',
  setup() {
    const { $gettext } = useGettext()
    const themeStore = useThemeStore()
    const { currentTheme } = storeToRefs(themeStore)

    const { isDelegatingAuthentication, postMessage, verifyDelegatedAuthenticationOrigin } =
      useEmbedMode()

    const error = ref(false)

    const logoImg = computed(() => unref(currentTheme)?.logo)
    const cardTitle = computed(() => {
      if (unref(error)) {
        return $gettext('Authentication failed')
      }
      return $gettext('Logging you in')
    })
    const cardHint = computed(() => {
      if (unref(error)) {
        return $gettext('Please contact the administrator if this error persists.')
      }
      return $gettext('Please wait, you are being redirected.')
    })
    const footerSlogan = computed(() => unref(currentTheme)?.slogan)

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
      cardTitle,
      cardHint,
      footerSlogan
    }
  }
})
</script>
