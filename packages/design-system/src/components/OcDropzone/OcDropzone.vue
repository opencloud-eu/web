<template>
  <div
    class="oc-dropzone flex justify-center items-center border-dashed border-role-outline opacity-90 [&_*]:pointer-events-none"
  >
    <!-- @slot Message inside of the dropzone -->
    <slot />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'OcDropzone' })
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-dropzone {
    @apply p-4 text-center text-2xl;
  }
}
</style>
