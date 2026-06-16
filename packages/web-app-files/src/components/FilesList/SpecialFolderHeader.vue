<template>
  <div
    class="special-folder-header flex items-center gap-3 rounded-md px-4 py-3 mx-4 my-2 bg-warning-100 text-warning-800 border border-warning-300"
  >
    <oc-icon name="tools" fill-type="line" size="medium" />
    <div class="flex flex-col">
      <span class="font-medium" v-text="title" />
      <span v-if="detail" class="text-sm opacity-80" v-text="detail" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

const props = defineProps<{
  errorMessage?: string | null
  viewType?: string | null
}>()

const { $gettext } = useGettext()

const title = computed(() => {
  if (props.errorMessage) {
    return $gettext('Special folder view not available')
  }
  if (props.viewType) {
    return $gettext('No view handler for type "%{type}"', { type: props.viewType })
  }
  return $gettext('Special folder view not configured')
})

const detail = computed(() => {
  return props.errorMessage || null
})
</script>
