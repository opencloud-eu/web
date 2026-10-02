<template>
  <oc-button
    v-oc-tooltip="label"
    class="app-download-button shrink-0 raw-hover-surface p-1"
    appearance="raw"
    :aria-label="label"
    @click="downloadAppAction.handler({ app, version })"
  >
    <oc-icon name="download" fill-type="line" />
    <span class="sr-only" v-text="label" />
  </oc-button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { App, AppVersion } from '../types'
import { useAppActionsDownload } from '../composables'

const {
  app,
  version = undefined,
  label: labelProp = ''
} = defineProps<{
  app: App
  version?: AppVersion
  label?: string
}>()

const { $gettext } = useGettext()
const { downloadAppAction } = useAppActionsDownload()

const label = computed(() => labelProp || $gettext('Download'))
</script>
