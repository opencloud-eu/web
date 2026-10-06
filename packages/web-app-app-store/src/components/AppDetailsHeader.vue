<template>
  <div class="app-details-header flex flex-col md:flex-row md:items-start md:justify-between gap-4">
    <div class="flex flex-col gap-1 min-w-0">
      <h2 class="app-details-title my-0 text-2xl font-bold">{{ app.name }}</h2>
      <p class="app-details-subtitle my-0 text-base" v-text="app.subtitle" />
      <p
        v-if="authorNames"
        class="app-details-meta my-0 text-sm text-role-on-surface-variant"
        v-text="$gettext('by %{authors}', { authors: authorNames })"
      />
      <app-tags v-if="app.tags.length" :app="app" class="mt-3" @click="emit('tagClick', $event)" />
    </div>
    <div class="flex flex-col items-start md:items-end gap-1 shrink-0">
      <oc-button
        class="app-details-download"
        appearance="filled"
        color-role="secondary"
        size="large"
        @click="downloadAppAction.handler({ app })"
      >
        <oc-icon name="download" fill-type="line" />
        <span
          v-text="$gettext('Download v%{version}', { version: app.mostRecentVersion.version })"
        />
      </oc-button>
      <span
        v-if="app.mostRecentVersion.minOpenCloud"
        class="text-sm text-role-on-surface-variant"
        v-text="
          $gettext('Requires OpenCloud %{version} or newer', {
            version: app.mostRecentVersion.minOpenCloud
          })
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { App } from '../types'
import { getAuthorNames } from '../helpers'
import { useAppActionsDownload } from '../composables'
import AppTags from './AppTags.vue'

const { app } = defineProps<{
  app: App
}>()

const emit = defineEmits<{
  (e: 'tagClick', tag: string): void
}>()

const { $gettext } = useGettext()
const { downloadAppAction } = useAppActionsDownload()

const authorNames = computed(() => getAuthorNames(app))
</script>
