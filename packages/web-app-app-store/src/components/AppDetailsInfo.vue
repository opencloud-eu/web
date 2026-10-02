<template>
  <section class="app-details-info">
    <h3 class="my-0 mb-2 text-base" v-text="$gettext('Information')" />
    <dl class="m-0">
      <app-details-info-row v-if="app.authors.length" :label="$gettext('Author')">
        <app-authors :app="app" />
      </app-details-info-row>
      <app-details-info-row :label="$gettext('Version')">
        {{ app.mostRecentVersion.version }}
      </app-details-info-row>
      <app-details-info-row v-if="minOpenCloud" :label="$gettext('Requires')">
        {{ $gettext('OpenCloud %{version}+', { version: minOpenCloud }) }}
      </app-details-info-row>
      <app-details-info-row v-if="app.resources.length" :label="$gettext('Resources')" stacked>
        <app-resources :app="app" />
      </app-details-info-row>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { App } from '../types'
import AppAuthors from './AppAuthors.vue'
import AppResources from './AppResources.vue'
import AppDetailsInfoRow from './AppDetailsInfoRow.vue'

const { app } = defineProps<{
  app: App
}>()

const minOpenCloud = computed(() => app.mostRecentVersion.minOpenCloud)
</script>
