<template>
  <app-template
    ref="template"
    :loading="isLoading"
    :breadcrumbs="breadcrumbs"
    :show-batch-actions="false"
    :show-view-options="false"
  >
    <template #actions>
      <div class="flex justify-end w-full my-2 items-center">
        <oc-search-bar
          v-model="filterTerm"
          class="w-3xs"
          :label="$gettext('Search')"
          :placeholder="$gettext('Search for extensions')"
          button-hidden
          :is-rounded="false"
        />
      </div>
    </template>

    <template #mainContent>
      <app-loading-spinner v-if="isLoading" />
      <no-content-message
        v-else-if="!extensions.length"
        id="admin-settings-extensions-empty"
        img-src="/images/empty-states/empty-extensions.svg"
      >
        <template #message>
          <span v-text="$gettext('No extensions found')" />
        </template>
        <template #callToAction>
          <span v-text="$gettext('Install an extension and it will show up here')" />
        </template>
      </no-content-message>
      <extensions-list v-else :extensions="extensions" :filter-term="filterTerm" />
    </template>
  </app-template>
</template>

<script setup lang="ts">
import AppTemplate from '../components/AppTemplate.vue'
import ExtensionsList from '../components/Extensions/ExtensionsList.vue'
import {
  AppLoadingSpinner,
  NoContentMessage,
  useAppsStore,
  useConfigStore
} from '@opencloud-eu/web-pkg'
import { computed, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'

const { $gettext } = useGettext()
const appsStore = useAppsStore()
const configStore = useConfigStore()
const { apps, appLoadingFailure } = storeToRefs(appsStore)

const filterTerm = ref('')
const isLoading = ref(false)

interface ExtensionInfo {
  name: string
  icon?: string
  version?: string
  loaded: boolean
}

const extensions = computed<ExtensionInfo[]>(() => {
  return configStore.externalApps.map(({ id, version }) => {
    const app = unref(apps)[id]
    const failure = unref(appLoadingFailure)[id]

    return {
      ...app,
      version,
      name: app?.name || id,
      loaded: !failure
    }
  })
})

const breadcrumbs = computed(() => [
  {
    text: $gettext('Extensions'),
    to: { path: '/admin-settings/extensions' }
  }
])
</script>
