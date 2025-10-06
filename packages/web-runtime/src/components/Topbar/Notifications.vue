<template>
  <div id="oc-notifications" class="flex">
    <notification-bell :notification-count="notifications.length" />
    <oc-drop
      id="oc-notifications-drop"
      :title="$gettext('Notifications')"
      drop-id="notifications-dropdown"
      toggle="#oc-notifications-bell"
      mode="click"
      class="w-md max-w-full max-h-[400px] overflow-y-auto overflow-x-hidden"
      :options="{ pos: 'bottom-right', delayHide: 0 }"
      padding-size="small"
    >
      <div class="flex justify-end items-center mb-2">
        <oc-button
          v-if="notifications.length"
          class="oc-notifications-mark-all"
          appearance="raw"
          no-hover
          @click="deleteNotificationsTask.perform(notifications.map((n) => n.notification_id))"
        >
          <span class="text-sm" v-text="$gettext('Mark all as read')" />
        </oc-button>
      </div>
      <div class="relative">
        <div v-if="loading" class="oc-notifications-loading">
          <div class="size-full bg-role-surface absolute opacity-60" />
          <oc-spinner
            class="absolute top-[50%] left-[50%] transform-[translate(-50%, -50%)] opacity-100"
            size="large"
          />
        </div>
        <span
          v-if="!notifications.length"
          class="oc-notifications-no-new"
          v-text="$gettext('Nothing new')"
        />
        <oc-list v-else>
          <li
            v-for="(el, index) in notifications"
            :key="index"
            class="oc-notifications-item [&>a]:text-role-on-surface z-1000 relative"
          >
            <component
              :is="el.computedLink ? 'router-link' : 'div'"
              class="flex items-center gap-2"
              :to="el.computedLink"
            >
              <user-avatar
                :user-id="el.messageRichParameters?.user?.id || el.user"
                :user-name="el.messageRichParameters?.user?.displayname || el.user"
              />
              <div>
                <div v-if="!el.message && !el.messageRich" class="oc-notifications-subject">
                  <span v-text="el.subject" />
                </div>
                <div v-if="el.computedMessage" class="oc-notifications-message">
                  <span v-bind="{ innerHTML: el.computedMessage }" />
                </div>
                <div
                  v-if="el.link && el.object_type !== 'local_share'"
                  class="oc-notifications-link truncate w-sm"
                >
                  <a :href="el.link" target="_blank" v-text="el.link" />
                </div>
                <div v-if="el.datetime" class="text-sm text-role-on-surface-variant mt-1">
                  <span
                    v-oc-tooltip="formatDate(el.datetime)"
                    tabindex="0"
                    v-text="formatDateRelative(el.datetime)"
                  />
                </div>
              </div>
            </component>
            <hr v-if="index + 1 !== notifications.length" class="my-2" />
          </li>
        </oc-list>
      </div>
    </oc-drop>
  </div>
</template>
<script lang="ts">
import { computed, onMounted, onUnmounted, ref, unref } from 'vue'
import isEmpty from 'lodash-es/isEmpty'
import escape from 'lodash-es/escape'
import {
  useCapabilityStore,
  useSpacesStore,
  createFileRouteOptions,
  formatDateFromISO,
  formatRelativeDateFromISO,
  useClientService,
  UserAvatar
} from '@opencloud-eu/web-pkg'
import NotificationBell from './NotificationBell.vue'
import { Notification } from '../../helpers/notifications'
import { useGettext } from 'vue3-gettext'
import { useTask } from 'vue-concurrency'
import { MESSAGE_TYPE } from '@opencloud-eu/web-client/sse'
import { call } from '@opencloud-eu/web-client'
import { AxiosHeaders } from 'axios'

const POLLING_INTERVAL = 30000

export default {
  components: {
    UserAvatar,
    NotificationBell
  },
  setup() {
    const spacesStore = useSpacesStore()
    const capabilityStore = useCapabilityStore()
    const clientService = useClientService()
    const language = useGettext()

    const notifications = ref<Notification[]>([])
    const notificationsInterval = ref<ReturnType<typeof setInterval>>()

    const loading = computed(() => {
      return fetchNotificationsTask.isRunning || deleteNotificationsTask.isRunning
    })

    const formatDate = (date: string) => {
      return formatDateFromISO(date, language.current)
    }
    const formatDateRelative = (date: string) => {
      return formatRelativeDateFromISO(date, language.current)
    }

    const messageParameters = [
      { name: 'user', labelAttribute: 'displayname' },
      { name: 'resource', labelAttribute: 'name' },
      { name: 'space', labelAttribute: 'name' },
      { name: 'virus', labelAttribute: 'name' }
    ]
    const getMessage = ({ message, messageRich, messageRichParameters }: Notification): string => {
      if (messageRich && !isEmpty(messageRichParameters)) {
        let interpolatedMessage = messageRich
        for (const param of messageParameters) {
          if (interpolatedMessage.includes(`{${param.name}}`)) {
            const richParam = messageRichParameters[param.name] ?? undefined
            if (!richParam) {
              return message
            }
            const label = richParam[param.labelAttribute] ?? undefined
            if (!label) {
              return message
            }
            interpolatedMessage = interpolatedMessage.replace(
              `{${param.name}}`,
              `<strong>${escape(label)}</strong>`
            )
          }
        }
        return interpolatedMessage
      }
      return message
    }
    const getLink = ({ messageRichParameters, object_type }: Notification) => {
      if (!messageRichParameters) {
        return null
      }
      if (object_type === 'share') {
        return {
          name: 'files-shares-with-me',
          ...(!!messageRichParameters?.share?.id && {
            query: { scrollTo: messageRichParameters.share.id }
          })
        }
      }
      if (object_type === 'storagespace' && messageRichParameters?.space?.id) {
        const space = spacesStore.spaces.find(
          (s) => s.fileId === messageRichParameters?.space?.id.split('!')[0] && !s.disabled
        )
        if (space) {
          return {
            name: 'files-spaces-generic',
            ...createFileRouteOptions(space, { path: '', fileId: space.fileId })
          }
        }
      }
      return null
    }

    const fetchNotificationsTask = useTask(function* (signal) {
      try {
        const response = yield* call(
          clientService.httpAuthenticated.get<{ ocs: { data: Notification[] } }>(
            'ocs/v2.php/apps/notifications/api/v1/notifications',
            { signal }
          )
        )

        if ((response.headers as AxiosHeaders).get('Content-Length') === '0') {
          return
        }

        const {
          ocs: { data = [] }
        } = response.data
        notifications.value = data?.sort((a, b) => b.datetime.localeCompare(a.datetime)) || []
        unref(notifications).forEach((notification) => setAdditionalNotificationData(notification))
      } catch (e) {
        console.error(e)
      }
    }).restartable()

    const deleteNotificationsTask = useTask(function* (signal, ids) {
      try {
        yield clientService.httpAuthenticated.delete(
          'ocs/v2.php/apps/notifications/api/v1/notifications',
          { data: { ids } },
          { signal }
        )
      } catch (e) {
        console.error(e)
      } finally {
        notifications.value = unref(notifications).filter((n) => !ids.includes(n.notification_id))
      }
    }).restartable()

    const setAdditionalNotificationData = (notification: Notification) => {
      notification.computedMessage = getMessage(notification)
      notification.computedLink = getLink(notification)
    }

    const onSSENotificationEvent = (event: MessageEvent) => {
      try {
        const notification = JSON.parse(event.data) as Notification
        if (!notification || !notification.notification_id) {
          return
        }
        setAdditionalNotificationData(notification)
        notifications.value = [notification, ...unref(notifications)]
      } catch {
        console.error('Unable to parse sse notification data')
      }
    }

    onMounted(() => {
      fetchNotificationsTask.perform()
      if (unref(capabilityStore.supportSSE)) {
        clientService.sseAuthenticated.addEventListener(
          MESSAGE_TYPE.NOTIFICATION,
          onSSENotificationEvent
        )
      } else {
        notificationsInterval.value = setInterval(() => {
          fetchNotificationsTask.perform()
        }, POLLING_INTERVAL)
      }
    })

    onUnmounted(() => {
      if (unref(capabilityStore.supportSSE)) {
        clientService.sseAuthenticated.removeEventListener(
          MESSAGE_TYPE.NOTIFICATION,
          onSSENotificationEvent
        )
      } else {
        clearInterval(unref(notificationsInterval))
      }
    })

    return {
      notifications,
      fetchNotificationsTask,
      loading,
      deleteNotificationsTask,
      formatDate,
      formatDateRelative,
      getMessage,
      getLink
    }
  }
}
</script>
