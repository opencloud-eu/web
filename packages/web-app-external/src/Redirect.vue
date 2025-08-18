<template>
  <main class="external-redirect h-screen flex flex-col justify-center items-center">
    <h1 class="sr-only" v-text="pageTitle" />
    <oc-card class="text-center w-lg text-lg bg-role-surface-container rounded-xl">
      <h2 key="external-redirect-loading" class="mt-0">
        <span v-text="$gettext('One moment please…')" />
      </h2>
      <p v-text="$gettext('You are being redirected.')" />
    </oc-card>
  </main>
</template>

<script lang="ts">
import { computed, defineComponent, unref, watch } from 'vue'
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

export default defineComponent({
  setup() {
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

    return {
      pageTitle
    }
  }
})
</script>
