<template>
  <div>
    <div class="mb-6">Hidden announcer (please inspect element)</div>
    <oc-button @click="announce">Announce</oc-button>
    <oc-hidden-announcer ref="announcer" level="polite" />
  </div>
</template>

<script setup lang="ts">
import { unref, useTemplateRef } from 'vue'

const announcer = useTemplateRef('announcer')

const announce = () => {
  unref(announcer)?.announce('Announcement complete')
}
</script>
