<template>
  <oc-button
    id="files-toggle-sidebar"
    v-oc-tooltip="buttonLabel"
    :aria-label="buttonLabel"
    appearance="raw-inverse"
    color-role="chrome"
    no-hover
    class="my-2"
    @click.stop="toggleSideBar"
  >
    <oc-icon name="side-bar-right" :fill-type="buttonIconFillType" />
  </oc-button>
</template>

<script lang="ts">
import { computed, defineComponent, unref } from 'vue'
import { SideBarEventTopics, useEventBus, useSideBar } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'SideBarToggle',
  setup() {
    const eventBus = useEventBus()
    const { $gettext } = useGettext()
    const { isSideBarOpen } = useSideBar({ bus: eventBus })
    const buttonIconFillType = computed(() => {
      return unref(isSideBarOpen) ? 'fill' : 'line'
    })
    const buttonLabel = computed(() => {
      if (unref(isSideBarOpen)) {
        return $gettext('Close sidebar to hide details')
      }
      return $gettext('Open sidebar to view details')
    })
    const toggleSideBar = () => {
      eventBus.publish(SideBarEventTopics.toggle)
    }

    return {
      buttonIconFillType,
      buttonLabel,
      toggleSideBar
    }
  }
})
</script>
