<template>
  <div class="flex justify-center items-center flex-col page-not-found">
    <oc-icon name="emotion-normal" fill-type="line" size="xxlarge" />
    <h1 class="text-role-on-surface-variant">404</h1>
    <p
      class="text-xl m-0 text-role-on-surface-variant"
      v-text="$gettext('The page you are looking for does not exist.')"
    />
  </div>
</template>
<script setup lang="ts"></script>
