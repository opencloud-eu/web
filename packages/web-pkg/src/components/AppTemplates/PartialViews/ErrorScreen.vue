<template>
  <no-content-message class="h-full" img-src="images/illustrations/404.svg">
    <template v-if="message" #message>
      <span v-text="message" />
    </template>
  </no-content-message>
</template>

<script setup lang="ts">
import NoContentMessage from '../../NoContentMessage.vue'

const { message = '' } = defineProps<{
  message?: string
}>()
</script>
