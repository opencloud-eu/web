<template>
  <div class="flex items-center min-w-0">
    <component :is="tag" class="truncate" :class="titleClass">
      <router-link v-if="linked" :to="getAppDetailsRoute(app)">
        <oc-filter-highlight :text="app.name" :term="term" />
      </router-link>
      <oc-filter-highlight v-else :text="app.name" :term="term" />
    </component>
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
  tag = 'h3',
  titleClass = '',
  linked = true
} = defineProps<{
  app: App
  term?: string
  tag?: 'h2' | 'h3'
  titleClass?: string
  linked?: boolean
}>()
</script>
