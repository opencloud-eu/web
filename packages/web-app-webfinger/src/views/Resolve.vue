<template>
  <main class="h-screen flex flex-col justify-center items-center">
    <h1 class="sr-only" v-text="pageTitle" />
    <oc-card
      :title="cardTitle"
      body-class="w-sm text-center"
      class="bg-role-surface-container rounded-lg"
    >
      <template v-if="hasError">
        <p v-text="$gettext('Something went wrong.')" />
        <p v-text="$gettext('We could not resolve the destination.')" />
      </template>
      <p v-else v-text="$gettext('You are being redirected.')" />
    </oc-card>
  </main>
</template>

<script lang="ts">
import { computed, defineComponent, ref, unref, watch } from 'vue'
import {
  useClientService,
  useConfigStore,
  useLoadingService,
  useRoute,
  useRouteMeta
} from '@opencloud-eu/web-pkg'
import { OpenCloudServer, WebfingerDiscovery } from '../discovery'
import { useGettext } from 'vue3-gettext'
import { useAuthService } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'WebfingerResolve',
  setup() {
    const configStore = useConfigStore()
    const clientService = useClientService()
    const loadingService = useLoadingService()
    const authService = useAuthService()
    const route = useRoute()
    const { $gettext } = useGettext()

    const title = useRouteMeta('title', '')
    const pageTitle = computed(() => {
      return $gettext(unref(title))
    })

    const openCloudServers = ref<OpenCloudServer[]>([])
    const hasError = ref(false)
    const webfingerDiscovery = new WebfingerDiscovery(configStore.serverUrl, clientService)
    loadingService.addTask(async () => {
      try {
        const servers = await webfingerDiscovery.discoverOpenCloudServers()
        openCloudServers.value = servers
        if (servers.length === 0) {
          hasError.value = true
        }
      } catch (e) {
        console.error(e)
        if (e.response?.status === 401) {
          return authService.handleAuthError(unref(route), { forceLogout: true })
        }
        hasError.value = true
      }
    })

    watch(openCloudServers, (instances) => {
      if (instances.length === 0) {
        return
      }
      // we can't deal with multi-instance results. just pick the first one for now.
      window.location.href = openCloudServers.value[0].href
    })

    const cardTitle = computed(() => {
      if (unref(hasError)) {
        return $gettext('Sorry!')
      }
      return $gettext('One moment please…')
    })

    return {
      pageTitle,
      openCloudInstances: openCloudServers,
      hasError,
      cardTitle
    }
  }
})
</script>
