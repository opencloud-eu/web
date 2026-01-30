<template>
  <oc-button
    id="files-toggle-sidebar"
    v-oc-tooltip="buttonLabel"
    :aria-label="buttonLabel"
    appearance="raw-inverse"
    color-role="chrome"
    no-hover
    class="my-2"
    @click.stop="sidebarStore.toggleSideBar()"
  >
    <oc-icon name="side-bar-right" :fill-type="buttonIconFillType" />
  </oc-button>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useSideBar } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'

const { $gettext } = useGettext()
const sidebarStore = useSideBar()
const { isSideBarOpen } = storeToRefs(sidebarStore)

const buttonIconFillType = computed(() => {
  return unref(isSideBarOpen) ? 'fill' : 'line'
})
const buttonLabel = computed(() => {
  if (unref(isSideBarOpen)) {
    return $gettext('Close sidebar to hide details')
  }
  return $gettext('Open sidebar to view details')
})
</script>
