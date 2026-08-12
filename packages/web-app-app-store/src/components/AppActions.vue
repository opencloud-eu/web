<template>
  <oc-list class="app-actions flex justify-start gap-3">
    <action-menu-item
      v-for="action in actions"
      :key="`app-action-${action.name}`"
      size="small"
      :action="action"
      :action-options="{ app, version }"
      :button-classes="['raw-hover-surface']"
    />
  </oc-list>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { ActionMenuItem } from '@opencloud-eu/web-pkg'
import { useAppActionsDownload } from '../composables'
import { App, AppVersion } from '../types'

const { app, version = undefined } = defineProps<{
  app: App
  version?: AppVersion
}>()

const { downloadAppAction } = useAppActionsDownload()

const actions = computed(() => {
  return [downloadAppAction]
})
</script>
