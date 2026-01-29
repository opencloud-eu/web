<template>
  <oc-button @click="drawerActive = true">Open bottom drawer</oc-button>
  <oc-bottom-drawer
    v-if="drawerActive"
    id="example-bottom-drawer"
    :is-focus-trap-active="false"
    @clicked="drawerActive = false"
  >
    <div class="p-4 bg-role-surface-container">
      <h3>Bottom drawer content</h3>
      <p>Some content in the bottom drawer.</p>
    </div>
  </oc-bottom-drawer>
</template>
<script setup lang="ts">
import { ref } from 'vue'

const drawerActive = ref(false)
</script>
