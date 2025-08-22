<template>
  <div class="oc-dropzone flex justify-center items-center">
    <!-- @slot Message inside of the dropzone -->
    <slot />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'OcDropzone' })
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-dropzone {
    @apply p-4 text-center;
  }
}
</style>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-dropzone {
    @apply text-2xl;
  }
}
</style>
<style lang="scss">
.oc-dropzone {
  border: 1px dashed var(--oc-role-outline);
  opacity: 0.9;

  * {
    pointer-events: none;
  }
}
</style>
