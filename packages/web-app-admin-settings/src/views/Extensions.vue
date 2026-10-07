<template>
  <app-template :breadcrumbs="breadcrumbs" :show-batch-actions="false" :show-view-options="false">
    <template #actions>
      <div class="flex justify-end w-full my-2 items-center">
        <oc-search-bar
          v-model="filterTerm"
          class="w-full sm:w-3xs"
          :label="$gettext('Search')"
          :placeholder="$gettext('Search for apps')"
          button-hidden
          :is-rounded="false"
        />
      </div>
    </template>

    <template #mainContent>
      <no-content-message
        v-if="!extensions.length"
        id="admin-settings-extensions-empty"
        img-src="images/illustrations/apps.svg"
      >
        <template #message>
          <span v-text="$gettext('No apps found')" />
        </template>
        <template #callToAction>
          <span v-text="$gettext('Install an app and it will show up here')" />
        </template>
      </no-content-message>
      <template v-else>
        <p
          v-if="compatibilityLoadingFailed"
          class="extensions-compatibility-error flex items-center gap-1 text-role-error mx-4 mt-2"
          role="alert"
        >
          <oc-icon name="error-warning" fill-type="line" size-class="size-4" class="shrink-0" />
          <span
            v-text="
              $gettext(
                'Compatibility information could not be loaded. Make sure %{url} is reachable and allowed by the content security policy.',
                { url: APP_STORE_URL }
              )
            "
          />
        </p>
        <extensions-list
          :extensions="extensions"
          :filter-term="filterTerm"
          :server-version="serverVersion"
          :loading-compatibility="compatibilityLoading"
        />
      </template>
    </template>
  </app-template>
</template>

<script setup lang="ts">
import AppTemplate from '../components/AppTemplate.vue'
import ExtensionsList from '../components/Extensions/ExtensionsList.vue'
import { NoContentMessage, useAppsStore, useConfigStore } from '@opencloud-eu/web-pkg'
import { computed, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { APP_STORE_URL, useAppCompatibility } from '../composables'
import { ExtensionInfo, ExtensionStatus } from '../components/Extensions/types'

const { $gettext } = useGettext()
const appsStore = useAppsStore()
const configStore = useConfigStore()
const { apps, appLoadingFailure } = storeToRefs(appsStore)

const {
  serverVersion,
  loading: compatibilityLoading,
  loadingFailed: compatibilityLoadingFailed,
  loadAppStoreApps,
  getAppStoreName,
  getVersionConstraints,
  isCompatible
} = useAppCompatibility()

const filterTerm = ref('')

// incompatibility is the most likely cause for a failed app, so it takes precedence
function getStatus(loaded: boolean, compatible: boolean): ExtensionStatus {
  if (!compatible) {
    return 'incompatible'
  }
  return loaded ? 'active' : 'failed'
}

const extensions = computed<ExtensionInfo[]>(() => {
  return configStore.externalApps.map(({ id, version }) => {
    const app = unref(apps)[id]
    const loaded = !unref(appLoadingFailure)[id]
    const constraints = getVersionConstraints(id, version)

    return {
      ...app,
      ...constraints,
      version,
      name: app?.name || getAppStoreName(id) || id,
      status: getStatus(loaded, isCompatible(constraints)),
      loaded
    }
  })
})

loadAppStoreApps()

const breadcrumbs = computed(() => [
  {
    text: $gettext('Apps'),
    to: { path: '/admin-settings/apps' }
  }
])
</script>
