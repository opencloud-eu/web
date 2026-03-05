<template>
  <no-content-message img-src="/images/empty-states/404.svg" class="page-not-found h-full">
    <template #message>
      <span v-text="$gettext('404')" />
    </template>
    <template #callToAction>
      <span v-text="$gettext('The page you are looking for does not exist')" />
    </template>
  </no-content-message>
</template>
<script setup lang="ts">
import { NoContentMessage } from '@opencloud-eu/web-pkg'
</script>
