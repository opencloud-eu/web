<template>
  <section v-if="versions.length" class="app-versions">
    <div class="flex items-baseline justify-between gap-4 mb-2">
      <h2 class="my-0 text-base" v-text="$gettext('Versions')" />
      <span class="text-sm text-role-on-surface-variant" v-text="versionCountText" />
    </div>
    <ul :id="versionsId" class="m-0 p-0">
      <li
        v-for="(version, index) in visibleVersions"
        :key="version.version"
        :data-item-id="version.version"
        class="app-version flex items-center gap-2 py-1 border-b border-role-surface-container-highest last:border-b-0"
      >
        <span class="flex flex-col">
          <span class="flex items-center gap-2 h-5">
            <span class="app-version-number text-sm font-semibold" v-text="`v${version.version}`" />
            <oc-tag v-if="index === 0" size="xsmall" rounded class="app-version-latest">
              {{ $gettext('Latest') }}
            </oc-tag>
          </span>
          <time
            v-if="version.releaseDate"
            class="app-version-release-date text-xs text-role-on-surface-variant"
            :datetime="version.releaseDate"
            v-text="formatReleaseDate(version.releaseDate)"
          />
          <span
            v-else
            class="app-version-release-date text-xs text-role-on-surface-variant"
            aria-hidden="true"
            v-text="'-'"
          />
        </span>
        <span class="flex items-center gap-2 ml-auto">
          <span
            v-if="getVersionRange(version)"
            class="app-version-opencloud-range text-sm text-role-on-surface-variant"
            v-text="getVersionRange(version)"
          />
          <app-download-button :app="app" :version="version" />
        </span>
      </li>
    </ul>
    <oc-button
      v-if="versions.length > collapsedCount"
      appearance="raw"
      class="app-versions-toggle mt-2 text-sm"
      :aria-expanded="expanded"
      :aria-controls="versionsId"
      @click="expanded = !expanded"
    >
      {{
        expanded
          ? $gettext('Show less')
          : $gettext('Show all %{count} versions', { count: versions.length.toString() })
      }}
    </oc-button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, unref, useId } from 'vue'
import { useGettext } from 'vue3-gettext'
import { formatDateFromISO } from '@opencloud-eu/web-pkg'
import { App } from '../types'
import { isValidUrl } from '../helpers'
import AppDownloadButton from './AppDownloadButton.vue'
import { useOpenCloudRequirement } from '../composables'

const { app } = defineProps<{
  app: App
}>()

const language = useGettext()
const { $ngettext } = language
const { getVersionRange } = useOpenCloudRequirement()

const collapsedCount = 3
const expanded = ref(false)
const versionsId = `app-versions-${useId()}`

// versions are expected to be sorted from newest to oldest
const versions = computed(() => {
  return (app.versions || []).filter((version) => version.version && isValidUrl(version.url))
})
const visibleVersions = computed(() => {
  return unref(expanded) ? unref(versions) : unref(versions).slice(0, collapsedCount)
})
const versionCountText = computed(() => {
  const count = unref(versions).length
  return $ngettext('%{count} version', '%{count} versions', count, { count: count.toString() })
})

function formatReleaseDate(releaseDate: string) {
  return formatDateFromISO(releaseDate, language.current, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
