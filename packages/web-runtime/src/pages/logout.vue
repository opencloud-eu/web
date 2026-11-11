<template>
  <plain-card :title="cardTitle" :description="cardHint" icon="logout-box-r">
    <oc-button
      v-if="!isGuestLogout"
      id="exitAnchor"
      class="w-full p-2"
      size="large"
      appearance="filled"
      v-bind="loginButtonAttrs"
    >
      {{ loginButtonText }}
    </oc-button>
  </plain-card>
</template>
<script setup lang="ts">
import { computed, unref } from 'vue'
import { queryItemAsString, useConfigStore, useRouteQuery } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import PlainCard from '../components/PlainCard.vue'

const { $gettext } = useGettext()
const configStore = useConfigStore()
const guestQuery = useRouteQuery('guest')
const failedQuery = useRouteQuery('failed')

const isGuestLogout = computed(() => queryItemAsString(unref(guestQuery)) === 'true')
const isGuestLogoutFailed = computed(
  () => unref(isGuestLogout) && queryItemAsString(unref(failedQuery)) === 'true'
)

const cardTitle = computed(() => {
  if (unref(isGuestLogoutFailed)) {
    return $gettext('Logout failed')
  }
  return $gettext('Logged out')
})
const cardHint = computed(() => {
  if (unref(isGuestLogoutFailed)) {
    return $gettext(
      'Your session could not be ended. Go back and log out again, or clear the cookies of this site in your browser, so nobody else can access the share on this device.'
    )
  }
  if (unref(isGuestLogout)) {
    return $gettext(
      'You have been logged out successfully. Open the most recent link you received by email to request access again.'
    )
  }
  return $gettext('You have been logged out successfully.')
})
const loginButtonText = computed(() => {
  return $gettext('Log in again')
})
const loginButtonAttrs = computed(() => {
  if (configStore.options.loginUrl) {
    const configLoginURL = new URL(encodeURI(configStore.options.loginUrl))
    return {
      type: 'a' as const,
      href: configLoginURL.toString()
    }
  }
  return {
    type: 'router-link' as const,
    to: {
      name: 'login'
    }
  }
})
</script>
