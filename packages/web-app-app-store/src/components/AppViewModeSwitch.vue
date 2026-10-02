<template>
  <div class="app-view-mode-switch oc-button-group shrink-0">
    <oc-button
      v-for="mode in viewModes"
      :key="mode.name"
      :class="`app-view-mode-${mode.name}`"
      :appearance="modelValue === mode.name ? 'filled' : 'outline'"
      :aria-label="mode.label"
      :aria-pressed="modelValue === mode.name"
      @click="emit('update:modelValue', mode.name)"
    >
      <oc-icon :name="mode.icon.name" :fill-type="mode.icon.fillType" size-class="size-5" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { FolderView } from '@opencloud-eu/web-pkg'
import { AppViewMode } from '../types'

const { modelValue } = defineProps<{
  modelValue: AppViewMode
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', mode: AppViewMode): void
}>()

const { $gettext } = useGettext()

const viewModes = computed<{ name: AppViewMode; label: string; icon: FolderView['icon'] }[]>(() => [
  { name: 'tiles', label: $gettext('Grid'), icon: { name: 'gallery-view-2', fillType: 'none' } },
  { name: 'list', label: $gettext('List'), icon: { name: 'list-unordered', fillType: 'none' } }
])
</script>
