<template>
  <section v-if="versions.length" class="app-versions">
    <div class="flex items-baseline justify-between gap-4 mb-2">
      <h3 class="my-0 text-base" v-text="$gettext('Versions')" />
      <span class="text-sm text-role-on-surface-variant" v-text="versionCountText" />
    </div>
    <ul class="m-0 p-0">
      <li
        v-for="(version, index) in visibleVersions"
        :key="version.version"
        :data-item-id="version.version"
        class="app-version flex items-center gap-2 h-10 border-b border-role-surface-container-highest last:border-b-0"
      >
        <span class="app-version-number text-sm font-semibold" v-text="`v${version.version}`" />
        <oc-tag v-if="index === 0" size="small" rounded class="app-version-latest">
          {{ $gettext('Latest') }}
        </oc-tag>
        <span class="flex items-center gap-2 ml-auto">
          <span
            v-if="version.minOpenCloud"
            class="app-version-min-opencloud text-sm text-role-on-surface-variant"
            v-text="$gettext('OpenCloud %{version}+', { version: version.minOpenCloud })"
          />
          <app-download-button :app="app" :version="version" />
        </span>
      </li>
    </ul>
    <oc-button
      v-if="versions.length > collapsedCount"
      appearance="raw"
      class="app-versions-toggle mt-2 text-sm"
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
import { computed, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { App } from '../types'
import { isValidUrl } from '../helpers'
import AppDownloadButton from './AppDownloadButton.vue'

const { app } = defineProps<{
  app: App
}>()

const { $ngettext } = useGettext()

const collapsedCount = 3
const expanded = ref(false)

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
</script>
