<template>
  <app-template
    ref="template"
    :breadcrumbs="[
      {
        text: $gettext('General'),
        to: { name: 'admin-settings-general' }
      }
    ]"
  >
    <template #mainContent>
      <div class="px-4">
        <InfoSection />
      </div>
    </template>
  </app-template>
</template>

<script setup lang="ts">
import AppTemplate from '../components/AppTemplate.vue'
import InfoSection from '../components/General/InfoSection.vue'
</script>
