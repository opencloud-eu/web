<template>
  <div class="text-center flex justify-center items-center h-full">
    <oc-spinner size="xlarge" />
    <p v-translate class="invisible">Loading app</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'LoadingScreen'
})
</script>
