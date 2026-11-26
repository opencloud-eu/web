<template>
  <div class="pdf-viewer-print-progress flex flex-col gap-2">
    <oc-progress :value="current" :max="total" size="small" class="[&>div]:transition-none" />
    <p
      class="m-0 text-sm text-role-on-surface-variant"
      v-text="
        $gettext('Page %{current} of %{total}', { current: String(current), total: String(total) })
      "
    />
  </div>
</template>

<script setup lang="ts">
import type { Modal } from '@opencloud-eu/web-pkg'

// The bar goes without the transition of oc-progress: preparing the pages blocks the main
// thread, it would trail behind the text.
const { current, total } = defineProps<{
  modal: Modal
  /** Pages prepared so far. */
  current: number
  total: number
}>()
</script>
