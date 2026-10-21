<template>
  <div>
    <div class="mb-6">Hidden announcer (please inspect element)</div>
    <oc-button @click="announce">Announce</oc-button>
    <oc-hidden-announcer
      level="polite"
      :announcement="announcement"
      :announcement-key="announcementCount"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const announcement = ref('')
const announcementCount = ref(0)

const announce = () => {
  announcement.value = 'Announcement complete'
  announcementCount.value++
}
</script>
