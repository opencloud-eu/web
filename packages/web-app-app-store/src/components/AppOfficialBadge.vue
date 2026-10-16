<template>
  <span
    v-if="app.official"
    v-oc-tooltip="$gettext('OpenCloud develops and actively maintains this app.')"
    class="app-official-badge inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-[#e2baff] text-black pointer-events-auto z-10"
  >
    <oc-icon name="check" fill-type="line" size-class="size-3" />
    {{ $gettext('Official') }}
  </span>
</template>

<script setup lang="ts">
import { App } from '../types'

const { app } = defineProps<{
  app: App
}>()
</script>
