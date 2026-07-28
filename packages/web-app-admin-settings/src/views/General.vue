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
      <div class="px-4 flex flex-col gap-8">
        <InfoSection />
        <AnnouncementSection />
      </div>
    </template>
  </app-template>
</template>

<script setup lang="ts">
import AppTemplate from '../components/AppTemplate.vue'
import InfoSection from '../components/General/InfoSection.vue'
import AnnouncementSection from '../components/General/AnnouncementSection.vue'
</script>
