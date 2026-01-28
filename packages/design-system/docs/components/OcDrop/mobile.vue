<template>
  <portal-target name="app.runtime.bottom.drawer" />
  <oc-button id="drop-btn-mobile">Open drop</oc-button>
  <oc-drop toggle="#drop-btn-mobile" title="Mobile drop title" mode="click" padding-size="medium">
    Some content.
  </oc-drop>
</template>
<script setup lang="ts">
import { PortalTarget } from 'portal-vue'
</script>
