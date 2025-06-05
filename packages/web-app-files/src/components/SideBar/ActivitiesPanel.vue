<template>
  <oc-loader v-if="isLoading" />
  <template v-else>
    <p v-if="!activities.length" v-text="$gettext('No activities')" />
    <div v-else class="oc-ml-s">
      <oc-list class="oc-timeline">
        <li v-for="activity in activities" :key="activity.id">
          <div class="oc-flex oc-flex-middle">
            <oc-avatars
              :items="getAvatarsFromActivity(activity)"
              class="oc-mr-xs"
              stacked
              gap-size="small"
              :width="16.8"
              icon-size="xsmall"
            >
              <template #userAvatars="{ avatars, width }">
                <user-avatar
                  v-for="avatar in avatars"
                  :key="avatar.userId"
                  :user-id="avatar.userId"
                  :user-name="avatar.userName"
                  :width="width"
                />
              </template>
            </oc-avatars>
            <span v-html="getHtmlFromActivity(activity)" />
          </div>
          <span
            class="oc-text-muted oc-text-small oc-mt-s"
            v-text="getTimeFromActivity(activity)"
          />
        </li>
      </oc-list>
      <p class="oc-text-muted oc-text-small" v-text="activitiesFooterText" />
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, inject, Ref, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { formatDateFromDateTime, useClientService, UserAvatar } from '@opencloud-eu/web-pkg'
import { useTask } from 'vue-concurrency'
import { call, Resource } from '@opencloud-eu/web-client'
import { DateTime } from 'luxon'
import { Activity } from '@opencloud-eu/web-client/graph/generated'
import escape from 'lodash-es/escape'

const { $ngettext, current: currentLanguage } = useGettext()
const clientService = useClientService()
const resource = inject<Ref<Resource>>('resource')
const activities = ref<Activity[]>([])
const activitiesLimit = 200

const activitiesFooterText = computed(() => {
  return $ngettext(
    'Showing %{activitiesCount} activity',
    'Showing %{activitiesCount} activities',
    unref(activities).length,
    {
      activitiesCount: unref(activities).length.toString()
    }
  )
})

const loadActivitiesTask = useTask(function* (signal) {
  activities.value = yield* call(
    clientService.graphAuthenticated.activities.listActivities(
      `itemid:${unref(resource).fileId} AND limit:${activitiesLimit} AND sort:desc`,
      { signal }
    )
  )
}).restartable()

const isLoading = computed(() => {
  return loadActivitiesTask.isRunning || !loadActivitiesTask.last
})

const getHtmlFromActivity = (activity: Activity) => {
  let message = activity.template.message
  for (const [key, value] of Object.entries(activity.template.variables)) {
    const escapedValue = escape(value.displayName || value.name)

    message = message.replace(`{${key}}`, `<strong>${escapedValue}</strong>`)
  }
  return message
}

const getAvatarsFromActivity = (activity: Activity) => {
  const avatars = []

  for (const key of ['user', 'sharee']) {
    const entry = activity.template.variables[key]
    if (entry) {
      avatars.push({
        userName: entry.displayName,
        displayName: entry.displayName,
        userId: entry.id,
        avatarType: entry.shareType || 'user'
      })
    }
  }

  return avatars
}

const getTimeFromActivity = (activity: Activity) => {
  const dateTime = DateTime.fromISO(activity.times.recordedTime)
  return formatDateFromDateTime(dateTime, currentLanguage)
}

watch(
  resource,
  () => {
    loadActivitiesTask.perform()
  },
  {
    immediate: true,
    deep: true
  }
)
</script>
