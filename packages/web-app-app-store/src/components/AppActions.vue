<template>
  <oc-list class="app-actions flex justify-start gap-3">
    <li>
      <oc-button
        type="a"
        :href="getDownloadVersion({ app }).url"
        :download="getDownloadFilename({ app })"
        :aria-label="$gettext('Download %{app}', { app: app.name })"
        appearance="outline"
        size="small"
        class="raw-hover-surface"
      >
        <oc-icon name="download" fill-type="line" size="small" />
        <span v-text="$gettext('Download')" />
      </oc-button>
    </li>
  </oc-list>
</template>
<script setup lang="ts">
import { useAppActionsDownload } from '../composables'
import { App } from '../types'

const { app } = defineProps<{
  app: App
}>()

const { getDownloadVersion, getDownloadFilename } = useAppActionsDownload()
</script>
