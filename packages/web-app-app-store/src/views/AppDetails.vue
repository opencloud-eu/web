<template>
  <div class="h-full overflow-auto p-4 md:px-8">
    <div class="mx-auto mt-2 max-w-256 flex flex-col gap-6">
      <router-link
        :to="backRoute"
        class="app-details-back self-start inline-flex items-center gap-1 text-sm text-role-secondary"
      >
        <oc-icon name="arrow-left-s" fill-type="line" size-class="size-4" />
        <span v-text="$gettext('Back to App Store')" />
      </router-link>
      <template v-if="!app">
        <h1 class="my-0 text-2xl font-bold wrap-anywhere" v-text="appId" />
        <no-content-message
          id="app-store-app-not-found"
          img-src="images/illustrations/extensions.svg"
        >
          <template #message>
            <span v-text="$gettext('App not found')" />
          </template>
        </no-content-message>
      </template>
      <div v-else class="app-details flex flex-col gap-6">
        <app-details-header :app="app" @tag-click="onTagClicked" />
        <hr class="m-0 border-t border-role-surface-container-highest" />
        <div class="grid md:grid-cols-[3fr_2fr] gap-8">
          <div class="flex flex-col gap-6 min-w-0">
            <app-details-gallery :app="app" />
            <section class="app-details-description">
              <h2 class="my-0 mb-2 text-base" v-text="$gettext('Description')" />
              <text-editor-viewer
                v-if="app.description"
                class="max-w-[70ch]"
                :content="app.description"
                :aria-label="$gettext('App description')"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { onBeforeRouteLeave, RouteLocationRaw } from 'vue-router'
import {
  NoContentMessage,
  TextEditorViewer,
  useDocumentTitle,
  useRouteParam,
  useRouter
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { App } from '../types'
import { APPID } from '../appid'
import { getAppListRoute } from '../helpers'
import { useAppsStore } from '../piniaStores'
import AppDetailsHeader from '../components/AppDetailsHeader.vue'
import AppDetailsGallery from '../components/AppDetailsGallery.vue'
import AppDetailsInfo from '../components/AppDetailsInfo.vue'
import AppVersions from '../components/AppVersions.vue'

const appId = useRouteParam('appId')
const appsStore = useAppsStore()
const router = useRouter()

const app = computed<App>(() => appsStore.getById(unref(appId)))

const { $gettext } = useGettext()
const titleSegments = computed(() => [unref(app)?.name || unref(appId), $gettext('App Store')])
useDocumentTitle({ titleSegments })

// lets the list focus this app again when going back to it
onBeforeRouteLeave((to) => {
  appsStore.lastOpenedAppId = to.name === `${APPID}-list` ? unref(appId) : undefined
})

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
