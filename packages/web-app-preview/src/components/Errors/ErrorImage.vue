<template>
  <div class="oc-width-1-1 oc-flex oc-flex-column oc-flex-middle oc-flex-center">
    <oc-icon name="file-damage" size="xlarge" color="var(--oc-role-error)" />
    <p>
      {{ $gettext('Failed to load "%{filename}"', { filename: activeMediaFileCached.name }) }}
    </p>
    <oc-button @click="loadOriginalFile">
      {{ $gettext('Load Original') }}
    </oc-button>
  </div>
</template>
<script setup lang="ts">
import { CachedFile } from '../../helpers/types'

const { activeMediaFileCached } = defineProps<{
  activeMediaFileCached: CachedFile
}>()

const emit = defineEmits<{
  (e: 'replaceUrl', { url }: { url: string }): void
}>()

const loadOriginalFile = () => {
  emit('replaceUrl', { url: activeMediaFileCached.fallbackUrl })
}
</script>
