<template>
  <div class="text-center flex justify-center items-center h-full">
    <oc-spinner size="xlarge" />
    <p class="sr-only" v-text="$gettext('Loading app')" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'LoadingScreen'
})
</script>
