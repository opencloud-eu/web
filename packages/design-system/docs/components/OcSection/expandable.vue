<template>
  <div class="flex flex-col gap-3">
    <oc-section
      v-model:expanded="presentationExpanded"
      title="Presentation"
      subtitle="Image, Subtitle, Description"
      icon="image"
      expandable
    >
      <oc-text-input label="Subtitle" />
    </oc-section>
    <oc-section
      v-model:expanded="advancedExpanded"
      title="Advanced"
      subtitle="Quota, Members"
      icon="settings-3"
      expandable
    >
      <oc-text-input label="Quota" />
    </oc-section>
  </div>
  <p>
    Presentation expanded: {{ presentationExpanded }}, advanced expanded: {{ advancedExpanded }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const presentationExpanded = ref(true)
const advancedExpanded = ref(false)
</script>
