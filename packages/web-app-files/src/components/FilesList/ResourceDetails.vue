<template>
  <div class="resource-details flex flex-col items-center">
    <div class="oc-width-1-3@l oc-width-1-2@m oc-width-3-4">
      <file-info />
      <file-details class="mb-4" />
      <file-actions />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

import FileActions from '../SideBar/Actions/FileActions.vue'
import FileDetails from '../SideBar/Details/FileDetails.vue'
import { FileInfo, useOpenWithDefaultApp } from '@opencloud-eu/web-pkg'
import { useRouteQuery } from '@opencloud-eu/web-pkg'

export default defineComponent({
  components: {
    FileActions,
    FileDetails,
    FileInfo
  },
  provide() {
    return {
      // provide resource and space for sub-components
      resource: computed(() => this.singleResource),
      space: computed(() => this.space)
    }
  },
  props: {
    singleResource: {
      type: Object as PropType<Resource>,
      required: false,
      default: null
    },
    space: {
      type: Object as PropType<SpaceResource>,
      required: false,
      default: null
    }
  },
  setup(props) {
    const { openWithDefaultApp } = useOpenWithDefaultApp()
    const openWithDefaultAppQuery = useRouteQuery('openWithDefaultApp')
    if (unref(openWithDefaultAppQuery) === 'true') {
      openWithDefaultApp({
        space: props.space,
        resource: props.singleResource
      })
    }
  }
})
</script>
