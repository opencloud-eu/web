<template>
  <thead class="oc-thead">
    <slot />
  </thead>
</template>

<script setup lang="ts">
defineOptions({ name: 'OcTableHead' })
</script>

<style lang="scss">
.oc-thead {
  border-bottom: 0.5px solid var(--oc-role-outline-variant);
}
</style>
