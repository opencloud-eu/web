<template>
  <div class="flex items-center min-w-0">
    <h3 class="truncate" :class="titleClass">
      <!-- the link covers the whole surrounding item, interactive elements need to be positioned on top -->
      <router-link :to="getAppDetailsRoute(app)" class="after:absolute after:inset-0">
        <oc-filter-highlight :text="app.name" :term="term" />
      </router-link>
    </h3>
    <span class="ml-2 shrink-0 text-role-on-surface-variant text-sm">
      v{{ app.mostRecentVersion.version }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'
import { App } from '../types'
import { getAppDetailsRoute } from '../helpers'

const {
  app,
  term = '',
  titleClass = ''
} = defineProps<{
  app: App
  term?: string
  titleClass?: string
}>()
</script>
