<template>
  <oc-button id="toggle-bottom-drawer-parent">Open bottom drawer</oc-button>
  <oc-bottom-drawer
    ref="parent"
    drawer-id="example-bottom-drawer-parent"
    toggle="#toggle-bottom-drawer-parent"
    title="Example Bottom Drawer Parent"
    @show="renderChild = true"
    @hide="renderChild = false"
  >
    <oc-list class="flex flex-col p-2">
      <oc-button justify-content="left" appearance="raw" no-hover aria-expanded="false">
        <oc-icon size="small" name="rectangle" fill-type="line" />
        Simple button
      </oc-button>
      <oc-button
        id="toggle-bottom-drawer-child"
        class="mt-2"
        justify-content="left"
        appearance="raw"
        no-hover
        aria-expanded="false"
      >
        <oc-icon size="small" name="information" fill-type="line" />
        Open child parent drawer...
      </oc-button>
    </oc-list>
  </oc-bottom-drawer>
  <oc-bottom-drawer
    v-if="renderChild"
    drawer-id="example-bottom-drawer-child"
    toggle="#toggle-bottom-drawer-child"
    title="Example Bottom Drawer Child"
  >
    <oc-list class="flex flex-col p-2">
      <oc-button justify-content="left" appearance="raw" no-hover aria-expanded="false">
        <oc-icon size="small" name="rectangle" fill-type="line" />
        Simple button
      </oc-button>
    </oc-list>
  </oc-bottom-drawer>
</template>
<script setup lang="ts">
import { OcBottomDrawer } from '../../../src/components'
import { ref } from 'vue'

const renderChild = ref(false)
</script>
