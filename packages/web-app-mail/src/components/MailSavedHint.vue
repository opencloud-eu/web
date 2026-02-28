<template>
  <div v-if="show" class="flex items-center gap-1 text-role-on-surface-variant">
    <oc-icon name="check" fill-type="line" />
    <span class="text-sm" v-text="$gettext('Saved')" />
  </div>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'

defineProps<{ show: boolean }>()

const { $gettext } = useGettext()
</script>
