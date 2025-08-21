<template>
  <oc-list class="activity-list">
    <li v-for="(activityItems, date) in activitiesDateCategorized" :key="date" class="mb-6">
      <h2
        class="font-semibold oc-text-muted activity-list-date text-base capitalize"
        v-text="getDateHeadline(date)"
      />
      <oc-list class="ml-2 mt-2 timeline">
        <li v-for="activityItem in activityItems" :key="activityItem.id">
          <ActivityItem :activity="activityItem" />
        </li>
      </oc-list>
    </li>
  </oc-list>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import { Activity } from '@opencloud-eu/web-client/graph/generated'
import { DateTime } from 'luxon'
import ActivityItem from '../components/ActivityItem.vue'
import { formatDateFromDateTime } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

type DateActivityCollection = Record<string, Activity[]>
export default defineComponent({
  name: 'ActivityList',
  components: { ActivityItem },
  props: {
    activities: {
      type: Array as PropType<Activity[]>,
      required: true
    }
  },
  setup(props) {
    const { current: currentLanguage } = useGettext()

    const activitiesDateCategorized = computed<DateActivityCollection>(() => {
      return props.activities.reduce((acc: DateActivityCollection, activity) => {
        const date = DateTime.fromISO(activity.times.recordedTime).toISODate()

        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(activity)

        return acc
      }, {} as DateActivityCollection)
    })
    const getDateHeadline = (dateISO: string) => {
      const dateTime = DateTime.fromISO(dateISO)

      if (
        dateTime.hasSame(DateTime.now(), 'day') ||
        dateTime.hasSame(DateTime.now().minus({ day: 1 }), 'day')
      ) {
        return dateTime.toRelativeCalendar({ locale: currentLanguage })
      }

      return formatDateFromDateTime(dateTime, currentLanguage, DateTime.DATE_MED_WITH_WEEKDAY)
    }

    return { activitiesDateCategorized, getDateHeadline }
  }
})
</script>

<style lang="scss">
.activity-list {
  max-width: 1000px;
}
</style>
