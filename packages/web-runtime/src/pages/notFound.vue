<template>
  <no-content-message
    img-src="images/illustrations/404.svg"
    class="page-not-found h-full"
    role="main"
  >
    <template #message>
      <h1 class="sr-only" v-text="$gettext('Page not found')" />
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
