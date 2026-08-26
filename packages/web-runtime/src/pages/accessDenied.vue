<template>
  <plain-card :title="cardTitle" :description="cardHint" icon="user">
    <div class="flex flex-col gap-4">
      <oc-button
        v-if="accessDeniedHelpUrl"
        type="a"
        appearance="raw"
        justify-content="left"
        :href="accessDeniedHelpUrl"
        target="_blank"
        no-hover
      >
        <span v-text="$gettext('Read more')" />
      </oc-button>
      <oc-button
        id="exitAnchor"
        class="w-full p-2"
        size="large"
        appearance="filled"
        v-bind="logoutButtonsAttrs"
      >
        {{ navigateToLoginText }}
      </oc-button>
    </div>
  </plain-card>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import {
  queryItemAsString,
  useConfigStore,
  useRouteQuery,
  useThemeStore
} from '@opencloud-eu/web-pkg'
import PlainCard from '../components/PlainCard.vue'

const themeStore = useThemeStore()
const { currentTheme } = storeToRefs(themeStore)
const configStore = useConfigStore()
const redirectUrlQuery = useRouteQuery('redirectUrl')

const { $gettext } = useGettext()

const accessDeniedHelpUrl = computed(() => unref(currentTheme).urls?.accessDeniedHelp)

const cardTitle = computed(() => {
  return $gettext('Not logged in')
})
const cardHint = computed(() => {
  return $gettext(
    'This could be because of a routine safety log out, or because your account is either inactive or not yet authorized for use. Please try logging in after a while or seek help from your Administrator.'
  )
})
const navigateToLoginText = computed(() => {
  return $gettext('Log in again')
})
const logoutButtonsAttrs = computed(() => {
  const redirectUrl = queryItemAsString(unref(redirectUrlQuery))
  if (configStore.options.loginUrl) {
    const configLoginURL = new URL(encodeURI(configStore.options.loginUrl))
    if (redirectUrl) {
      configLoginURL.searchParams.append('redirectUrl', redirectUrl)
    }
    return {
      type: 'a' as const,
      href: configLoginURL.toString()
    }
  }
  return {
    type: 'router-link' as const,
    to: {
      name: 'login',
      query: {
        ...(redirectUrl && { redirectUrl })
      }
    }
  }
})
</script>
