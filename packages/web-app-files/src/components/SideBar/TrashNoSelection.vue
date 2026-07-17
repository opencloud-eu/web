<template>
  <div id="oc-trash-no-selection" class="text-center mt-12">
    <oc-icon size-class="size-22" name="delete-bin" fill-type="line" />
    <p data-testid="selectTrashText" v-text="$gettext('Select a trash bin to view details')" />
  </div>
</template>
<script setup lang="ts"></script>
