<template>
  <div class="flex items-center activity-item">
    <div class="flex items-center">
      <oc-avatar :width="36" :user-name="activity.template.variables?.user?.displayName" />
      <span class="ml-2" v-text="activity.template.variables?.user?.displayName" />
    </div>
    <div>activity unknown</div>
    <div class="oc-text-truncate">
      <resource-list-item v-if="resource" :resource="resource" :is-resource-clickable="false" />
      <div
        v-if="resourceNotAccessible"
        v-oc-tooltip="$gettext('The resource is unavailable, it may have been deleted.')"
        class="oc-text-muted flex items-center p-1"
      >
        <oc-icon name="eye-off" />
        <span class="ml-2" v-text="activity.template.variables?.resource?.name" />
      </div>
    </div>
    <div><span v-text="recordedDateTime" /></div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, PropType, ref, unref } from 'vue'
import { Activity as GraphActivity, User } from '@opencloud-eu/web-client/graph/generated'
import { DateTime } from 'luxon'
import {
  formatDateFromDateTime,
  formatRelativeDateFromDateTime,
  ResourceListItem,
  useClientService
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

//FIXME: Use original type Activity from web-client when it's containing the variables field
type Activity = GraphActivity & {
  template: {
    variables?: {
      space?: SpaceResource
      resource?: Resource
      user?: User
    }
  }
}
export default defineComponent({
  name: 'ActivityList',
  components: { ResourceListItem },
  props: {
    activity: {
      type: Object as PropType<Activity>,
      required: true
    }
  },
  setup(props) {
    const clientService = useClientService()
    const { current: currentLanguage } = useGettext()
    const resource = ref<Resource>()
    const resourceNotAccessible = ref(false)

    const recordedDateTime = computed(() => {
      const dateTime = DateTime.fromISO(props.activity.times.recordedTime)

      const isWithinLastHour = dateTime > DateTime.now().minus({ hour: 1 })
      if (isWithinLastHour) {
        return formatRelativeDateFromDateTime(dateTime, currentLanguage)
      }

      return formatDateFromDateTime(dateTime, currentLanguage)
    })

    onMounted(async () => {
      try {
        resource.value = await clientService.webdav.getFileInfo(
          unref(props.activity.template.variables?.space),
          { fileId: props.activity.template.variables?.resource?.id }
        )
      } catch {
        resourceNotAccessible.value = true
      }
    })

    return {
      recordedDateTime,
      resource,
      resourceNotAccessible
    }
  }
})
</script>

<style lang="scss">
.activity-item {
  .oc-resource-name {
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
  }
}

.activity-item > * {
  flex: 1;
  text-align: left;
}

.activity-item > *:last-child {
  text-align: right !important;
}
</style>
