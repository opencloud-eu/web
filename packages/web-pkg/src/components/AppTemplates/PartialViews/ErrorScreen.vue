<template>
  <div class="text-center flex justify-center items-center h-full">
    <oc-icon size-class="size-22" name="error-warning" fill-type="line" />
    <p v-if="message" class="text-xl">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
const { message = '' } = defineProps<{
  message?: string
}>()
</script>
