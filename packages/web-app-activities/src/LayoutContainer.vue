<template>
  <main id="activities" class="p-4 overflow-auto">
    <router-view />
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'LayoutContainer'
})
</script>
