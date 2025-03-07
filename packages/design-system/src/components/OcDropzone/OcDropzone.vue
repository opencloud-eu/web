<template>
  <div class="oc-dropzone">
    <!-- @slot Message inside of the dropzone -->
    <slot />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'OcDropzone' })
</script>

<style lang="scss">
.oc-dropzone {
  align-items: center;
  border: 1px dashed var(--oc-role-outline);
  display: flex;
  font-size: 1.5rem;
  justify-content: center;
  line-height: 1.5;
  opacity: 0.9;
  padding: var(--oc-space-medium);
  text-align: center;

  * {
    pointer-events: none;
  }
}
</style>
