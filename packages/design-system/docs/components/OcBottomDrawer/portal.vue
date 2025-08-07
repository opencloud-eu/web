<template>
  <portal-target name="app.design-system.oc-bottom-drawer.portal" />

  <oc-button id="toggle-bottom-drawer-portal">Open bottom drawer</oc-button>
  <oc-bottom-drawer
    drawer-id="example-bottom-drawer"
    toggle="#toggle-bottom-drawer-portal"
    title="Example Bottom Drawer"
    use-portal
    portal-target="app.design-system.oc-bottom-drawer.portal"
  >
    Some content in the bottom drawer.
  </oc-bottom-drawer>
</template>
<script setup lang="ts">
import { OcBottomDrawer } from '../../../src/components'
</script>
