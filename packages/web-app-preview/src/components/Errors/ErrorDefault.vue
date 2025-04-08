<template>
  <div class="oc-width-1-1 oc-flex oc-flex-column oc-flex-middle oc-flex-center">
    <oc-icon name="file-damage" size="xlarge" color="var(--oc-role-error)" />
    <p>
      {{ $gettext('Failed to load "%{filename}"', { filename: activeMediaFileCached.name }) }}
    </p>
  </div>
</template>
<script setup lang="ts">
import { CachedFile } from '../../helpers/types'

const { activeMediaFileCached } = defineProps<{
  activeMediaFileCached: CachedFile
}>()
</script>
