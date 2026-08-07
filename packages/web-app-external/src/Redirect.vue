<template>
  <main class="h-screen flex flex-col justify-center items-center">
    <h1 class="sr-only" v-text="pageTitle" />
    <oc-card
      :title="$gettext('One moment please…')"
      class="text-center w-lg text-lg bg-role-surface-container rounded-xl"
    >
      <p v-text="$gettext('You are being redirected.')" />
    </oc-card>
  </main>
</template>

<script setup lang="ts">
import { computed, unref, watch } from 'vue'
import {
  queryItemAsString,
  useAppProviderService,
  useRouteMeta,
  useRouteQuery
} from '@opencloud-eu/web-pkg'
import { useRouter } from 'vue-router'
import { omit } from 'lodash-es'
import { useGettext } from 'vue3-gettext'
import { useApplicationReadyStore } from './piniaStores'
import { storeToRefs } from 'pinia'

const { $gettext } = useGettext()
const appProviderService = useAppProviderService()
const router = useRouter()
const { isReady } = storeToRefs(useApplicationReadyStore())

const appQuery = useRouteQuery('app')
const appNameQuery = useRouteQuery('appName')
const appName = computed(() => {
  if (unref(appQuery)) {
    return queryItemAsString(unref(appQuery))
  }
  if (unref(appNameQuery)) {
    return queryItemAsString(unref(appNameQuery))
  }
  if (unref(isReady)) {
    return appProviderService.appNames?.[0]
  }
  return ''
})

watch(
  isReady,
  (ready) => {
    if (!ready) {
      return
    }

    router.replace({
      name: `external-${unref(appName).toLowerCase()}-apps`,
      query: omit(unref(router.currentRoute).query, ['app', 'appName'])
    })
  },
  { immediate: true }
)

const title = useRouteMeta('title')
const pageTitle = computed(() => {
  return $gettext(unref(title))
})
</script>
