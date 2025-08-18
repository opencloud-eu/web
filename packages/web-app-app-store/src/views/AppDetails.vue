<template>
  <div class="app-details oc-card oc-card-default oc-card-rounded mx-auto">
    <div class="p-1">
      <router-link :to="{ name: `${APPID}-list` }" class="oc-flex oc-flex-middle app-details-back">
        <oc-icon name="arrow-left-s" fill-type="line" />
        <span v-text="$gettext('Back to list')" />
      </router-link>
    </div>
    <app-image-gallery :app="app" :show-pagination="true" />
    <div class="app-content oc-card-body p-4">
      <div class="oc-flex oc-flex-middle">
        <h2 class="my-2 oc-text-truncate app-details-title">{{ app.name }}</h2>
        <span class="ml-2 oc-text-muted text-sm mt-2"> v{{ app.mostRecentVersion.version }} </span>
      </div>
      <p class="my-0">{{ app.subtitle }}</p>
      <div v-if="app.description">
        <h3>{{ $gettext('Details') }}</h3>
        <text-editor
          class="my-2"
          :is-read-only="true"
          :markdown-mode="true"
          :current-content="app.description"
        />
      </div>
      <div v-if="app.tags">
        <h3>{{ $gettext('Tags') }}</h3>
        <app-tags :app="app" @click="onTagClicked" />
      </div>
      <div v-if="app.authors">
        <h3>{{ $gettext('Author') }}</h3>
        <app-authors :app="app" />
      </div>
      <div v-if="app.resources">
        <h3>{{ $gettext('Resources') }}</h3>
        <app-resources :app="app" />
      </div>
      <div v-if="app.versions">
        <h3>
          {{ $gettext('Releases') }}
          <app-contextual-helper />
        </h3>
        <app-versions :app="app" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, unref } from 'vue'
import { App } from '../types'
import { APPID } from '../appid'
import { TextEditor, useRouteParam, useRouter } from '@opencloud-eu/web-pkg'
import { useAppsStore } from '../piniaStores'
import AppResources from '../components/AppResources.vue'
import AppTags from '../components/AppTags.vue'
import AppVersions from '../components/AppVersions.vue'
import AppAuthors from '../components/AppAuthors.vue'
import AppImageGallery from '../components/AppImageGallery.vue'
import AppContextualHelper from '../components/AppContextualHelper.vue'

export default defineComponent({
  components: {
    AppContextualHelper,
    AppImageGallery,
    AppAuthors,
    AppResources,
    AppTags,
    AppVersions,
    TextEditor
  },
  setup() {
    const appIdRouteParam = useRouteParam('appId')
    const appId = computed(() => {
      return decodeURIComponent(unref(appIdRouteParam))
    })
    const appsStore = useAppsStore()
    const router = useRouter()

    const app = computed<App>(() => {
      return appsStore.getById(unref(appId))
    })

    const onTagClicked = (tag: string) => {
      router.push({ name: `${APPID}-list`, query: { filter: tag } })
    }

    return {
      app,
      APPID,
      onTagClicked
    }
  }
})
</script>

<style lang="scss">
.app-details {
  background-color: var(--oc-role-surface-container);
  box-shadow: none;
  max-width: 600px;
  outline: 0.5px solid var(--oc-role-outline-variant);

  .app-content {
    display: flex;
    flex-flow: column;
    gap: 1rem;
  }

  #text-editor-preview-component-preview,
  .app-content {
    background-color: var(--oc-role-surface-container) !important;
  }
}
</style>
