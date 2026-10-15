<template>
  <div ref="appListRef" class="h-full overflow-auto p-4 md:px-8">
    <div class="flex flex-wrap items-center justify-between gap-4 mt-2 mb-4">
      <div>
        <div class="flex items-center gap-1">
          <h1 class="my-0 text-2xl app-list-headline" v-text="$gettext('App Store')" />
          <app-contextual-helper />
        </div>
        <p
          class="app-list-subtitle text-sm text-role-on-surface-variant mt-1 mb-0"
          v-text="$gettext('Extensions for your OpenCloud – from OpenCloud and the community.')"
        />
      </div>
      <oc-search-bar
        is-filter
        class="apps-filter w-full sm:w-auto"
        :model-value="filterTermInput"
        :label="$gettext('Search')"
        :placeholder="$gettext('Search for apps')"
        button-hidden
        :is-rounded="false"
        @update:model-value="setFilterTerm"
      />
    </div>
    <app-tag-filter
      class="mb-6"
      :apps="searchedApps"
      :active-tag="activeTag"
      @select="setActiveTag"
    />
    <span class="sr-only" role="status" v-text="resultCountText" />
    <div v-if="filteredApps.length" class="flex items-center justify-between gap-4 mb-2">
      <div class="flex items-center gap-1">
        <h2
          class="app-list-results-title my-0 text-base capitalize"
          v-text="`${resultsTitle} (${filteredApps.length})`"
        />
        <oc-filter-chip
          class="app-list-sort [&_.oc-filter-chip-label]:text-sm"
          :filter-label="$gettext('Sort by')"
          :selected-item-names="[currentSortField.label]"
          :has-active-state="false"
          close-on-click
          raw
        >
          <template #default>
            <oc-list>
              <li v-for="field in sortFields" :key="field.label">
                <oc-button
                  :appearance="currentSortField === field ? 'filled' : 'raw-inverse'"
                  :color-role="currentSortField === field ? 'secondaryContainer' : 'surface'"
                  :no-hover="currentSortField === field"
                  justify-content="space-between"
                  class="app-list-sort-item"
                  @click="setSortField(field)"
                >
                  <span v-text="field.label" />
                  <oc-icon v-if="currentSortField === field" name="check" />
                </oc-button>
              </li>
            </oc-list>
          </template>
        </oc-filter-chip>
      </div>
      <app-view-mode-switch v-model="viewMode" />
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
        v-for="app in sortedApps"
        :key="`app-${app.repository.name}-${app.id}`"
        :app="app"
        :term="filterTerm"
        @search="toggleTagFilter"
      />
    </oc-list>
    <oc-list v-else class="grid [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] gap-4">
      <app-tile
        v-for="app in sortedApps"
        :key="`app-${app.repository.name}-${app.id}`"
        :app="app"
        :term="filterTerm"
        @search="toggleTagFilter"
      />
    </oc-list>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, unref, useTemplateRef, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { NoContentMessage, useRouter } from '@opencloud-eu/web-pkg'
import { useAppsStore } from '../piniaStores'
import { useAppFilter, useAppSort, useAppViewMode } from '../composables'
import { getAppDetailsRoute } from '../helpers'
import AppTile from '../components/AppTile.vue'
import AppListItem from '../components/AppListItem.vue'
import AppContextualHelper from '../components/AppContextualHelper.vue'
import AppTagFilter from '../components/AppTagFilter.vue'
import AppViewModeSwitch from '../components/AppViewModeSwitch.vue'

const appsStore = useAppsStore()
const { apps, lastOpenedAppId } = storeToRefs(appsStore)
const router = useRouter()
const appListRef = useTemplateRef<HTMLElement>('appListRef')

const { filterTerm, activeTag, searchedApps, filteredApps, setFilterTerm, setActiveTag } =
  useAppFilter(apps)
const { sortFields, sortedApps, currentSortField, setSortField } = useAppSort(filteredApps)
const { viewMode } = useAppViewMode()

// clicking the tag that is currently filtered by resets the filter
function toggleTagFilter(tag: string) {
  setActiveTag(tag.toLowerCase() === unref(activeTag).toLowerCase() ? '' : tag)
}
const { $gettext, $ngettext } = useGettext()

const resultsTitle = computed(() => unref(activeTag) || $gettext('All'))

const resultCountText = computed(() => {
  const count = unref(filteredApps).length
  return $ngettext('%{count} App', '%{count} Apps', count, { count: count.toString() })
})

// decoupled from the route query, otherwise trimming the term would swallow typed whitespace
const filterTermInput = ref(unref(filterTerm))
watch(filterTerm, (term) => {
  filterTermInput.value = term
})

// coming back from a details page, focus the app that was opened instead of leaving focus on the body
onMounted(() => {
  const appId = unref(lastOpenedAppId)
  if (!appId) {
    return
  }
  lastOpenedAppId.value = undefined
  const { href } = router.resolve(getAppDetailsRoute({ id: appId }))
  unref(appListRef).querySelector<HTMLElement>(`a[href="${href}"]`)?.focus()
})
</script>
