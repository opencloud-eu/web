<template>
  <div class="flex justify-center items-center flex-col page-not-found">
    <oc-icon name="emotion-normal" fill-type="line" size="xxlarge" />
    <h1 class="oc-text-muted">404</h1>
    <p
      class="text-xl m-0 oc-text-muted"
      v-text="$gettext('The page you are looking for does not exist.')"
    />
  </div>
</template>
<script setup lang="ts"></script>
