<template>
  <plain-card :title="cardTitle" :description="cardHint" icon="logout-box-r">
    <oc-button
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
import { computed } from 'vue'
import { useConfigStore } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import PlainCard from '../components/PlainCard.vue'

const { $gettext } = useGettext()
const configStore = useConfigStore()

const cardTitle = computed(() => {
  return $gettext('Logged out')
})
const cardHint = computed(() => {
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
