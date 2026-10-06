<template>
  <oc-list class="app-actions flex justify-start gap-3">
    <action-menu-item
      v-for="action in actions"
      :key="`app-action-${action.name}`"
      size="small"
      :action="action"
      :action-options="{ app }"
      :button-classes="['raw-hover-surface']"
    />
  </oc-list>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { ActionMenuItem } from '@opencloud-eu/web-pkg'
import { useAppActionsDownload } from '../composables'
import { App } from '../types'

const { app } = defineProps<{
  app: App
}>()

const { downloadAppAction } = useAppActionsDownload()

const actions = computed(() => {
  return [downloadAppAction]
})
</script>
