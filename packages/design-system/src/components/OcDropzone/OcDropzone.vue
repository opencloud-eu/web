<template>
  <div class="oc-dropzone">
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
  align-items: center;
  border: 1px dashed var(--oc-role-outline);
  display: flex;
  justify-content: center;
  opacity: 0.9;

  * {
    pointer-events: none;
  }
}
</style>
