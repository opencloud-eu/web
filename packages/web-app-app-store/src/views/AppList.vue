<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4 mt-2 mb-4">
      <div>
        <h1 class="my-0 text-2xl app-list-headline flex items-center gap-1">
          {{ $gettext('App Store') }}
          <app-contextual-helper />
        </h1>
        <p
          class="app-list-subtitle text-sm text-role-on-surface-variant mt-1 mb-0"
          v-text="$gettext('Extensions for your OpenCloud – from OpenCloud and the community.')"
        />
      </div>
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <oc-search-bar
          class="apps-filter w-full sm:w-auto"
          :model-value="filterTermInput"
          :label="$gettext('Search')"
          :placeholder="$gettext('Search for apps')"
          button-hidden
          :is-rounded="false"
          @update:model-value="setFilterTerm"
        />
        <app-view-mode-switch v-model="viewMode" />
      </div>
    </div>
    <app-tag-filter class="mb-6" :apps="apps" :active-tag="filterTerm" @select="setFilterTerm" />
    <div v-if="filteredApps.length" class="flex items-center justify-between gap-4 mb-2">
      <h2 class="app-list-results-title my-0 text-base" v-text="$gettext('All Apps')" />
      <span
        class="app-list-results-count text-sm text-role-on-surface-variant"
        v-text="resultCountText"
      />
    </div>
    <no-content-message
      v-if="!filteredApps.length"
      id="app-store-empty-filtered"
      img-src="images/illustrations/extensions.svg"
    >
      <template #message>
        <span v-text="$gettext('No apps found matching your search')" />
      </template>
      <template #callToAction>
        <span v-text="$gettext('Try refining the search term or filters to get results')" />
      </template>
    </no-content-message>
    <oc-list v-else-if="viewMode === 'list'" class="flex flex-col gap-2">
      <app-list-item
        v-for="app in filteredApps"
        :key="`app-${app.repository.name}-${app.id}`"
        :app="app"
        :term="filterTerm"
        @search="setFilterTerm"
      />
    </oc-list>
    <oc-list v-else class="grid [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] gap-4">
      <app-tile
        v-for="app in filteredApps"
        :key="`app-${app.repository.name}-${app.id}`"
        :app="app"
        :term="filterTerm"
        @search="setFilterTerm"
      />
    </oc-list>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { useAppsStore } from '../piniaStores'
import { useAppFilter, useAppViewMode } from '../composables'
import AppTile from '../components/AppTile.vue'
import AppListItem from '../components/AppListItem.vue'
import AppContextualHelper from '../components/AppContextualHelper.vue'
import AppTagFilter from '../components/AppTagFilter.vue'
import AppViewModeSwitch from '../components/AppViewModeSwitch.vue'

const appsStore = useAppsStore()
const { apps } = storeToRefs(appsStore)

const { filterTerm, filteredApps, setFilterTerm } = useAppFilter(apps)
const { viewMode } = useAppViewMode()
const { $ngettext } = useGettext()

const resultCountText = computed(() => {
  const count = unref(filteredApps).length
  return $ngettext('%{count} App', '%{count} Apps', count, { count: count.toString() })
})

// decoupled from the route query, otherwise trimming the term would swallow typed whitespace
const filterTermInput = ref(unref(filterTerm))
watch(filterTerm, (term) => {
  filterTermInput.value = term
})
</script>
