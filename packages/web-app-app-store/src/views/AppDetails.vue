<template>
  <no-content-message
    v-if="!app"
    id="app-store-app-not-found"
    img-src="images/illustrations/extensions.svg"
  >
    <template #message>
      <span v-text="$gettext('App not found')" />
    </template>
  </no-content-message>
  <div v-else class="app-details mx-auto mt-2 max-w-256 flex flex-col gap-6">
    <router-link
      :to="backRoute"
      class="app-details-back self-start inline-flex items-center gap-1 text-sm text-role-secondary"
    >
      <oc-icon name="arrow-left-s" fill-type="line" size-class="size-4" />
      <span v-text="$gettext('Back to App Store')" />
    </router-link>
    <app-details-header :app="app" @tag-click="onTagClicked" />
    <hr class="m-0 border-t border-role-surface-container-highest" />
    <div class="grid md:grid-cols-[3fr_2fr] gap-8">
      <div class="flex flex-col gap-6 min-w-0">
        <app-details-gallery :app="app" />
        <section class="app-details-description">
          <h3 class="my-0 mb-2 text-base" v-text="$gettext('Description')" />
          <text-editor-viewer
            v-if="app.description"
            class="max-w-[70ch]"
            :content="app.description"
          />
          <p v-else class="my-0 max-w-[70ch]" v-text="app.subtitle" />
        </section>
      </div>
      <aside class="flex flex-col gap-6 min-w-0">
        <app-details-info :app="app" />
        <app-versions :app="app" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { RouteLocationRaw } from 'vue-router'
import { NoContentMessage, TextEditorViewer, useRouteParam, useRouter } from '@opencloud-eu/web-pkg'
import { App } from '../types'
import { APPID } from '../appid'
import { getAppListRoute } from '../helpers'
import { useAppsStore } from '../piniaStores'
import AppDetailsHeader from '../components/AppDetailsHeader.vue'
import AppDetailsGallery from '../components/AppDetailsGallery.vue'
import AppDetailsInfo from '../components/AppDetailsInfo.vue'
import AppVersions from '../components/AppVersions.vue'

const appIdRouteParam = useRouteParam('appId')
const appId = computed(() => decodeURIComponent(unref(appIdRouteParam)))
const appsStore = useAppsStore()
const router = useRouter()

const app = computed<App>(() => appsStore.getById(unref(appId)))

// return to the list including its filters if we came from there
const backRoute = getBackRoute()

function getBackRoute(): RouteLocationRaw {
  const { back } = router.options.history.state
  if (typeof back === 'string' && router.resolve(back).name === `${APPID}-list`) {
    return back
  }
  return getAppListRoute()
}

function onTagClicked(tag: string) {
  router.push(getAppListRoute(tag))
}
</script>
