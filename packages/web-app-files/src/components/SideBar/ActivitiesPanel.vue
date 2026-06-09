<template>
  <oc-loader v-if="isLoading" />
  <template v-else>
    <p v-if="!activities.length" v-text="$gettext('No activities')" />
    <div v-else class="ml-2">
      <oc-list class="oc-timeline break-all">
        <li v-for="activity in activities" :key="activity.id">
          <div class="flex items-center">
            <oc-avatars
              :items="getAvatarsFromActivity(activity)"
              class="mr-1 inline-flex"
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
            class="text-role-on-surface-variant text-sm mt-2"
            v-text="getTimeFromActivity(activity)"
          />
        </li>
      </oc-list>
      <p class="text-role-on-surface-variant text-sm" v-text="activitiesFooterText" />
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, inject, Ref, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  FolderVaultEngine,
  formatDateFromDateTime,
  getVaultClaim,
  resolveFolderVault,
  useClientService,
  useExtensionRegistry,
  useGetMatchingSpace,
  UserAvatar
} from '@opencloud-eu/web-pkg'
import { useTask } from 'vue-concurrency'
import { call, Resource } from '@opencloud-eu/web-client'
import { DateTime } from 'luxon'
import { Activity } from '@opencloud-eu/web-client/graph/generated'
import escape from 'lodash-es/escape'

const { $ngettext, current: currentLanguage } = useGettext()
const clientService = useClientService()
const extensionRegistry = useExtensionRegistry()
const { getMatchingSpace } = useGetMatchingSpace()
const resource = inject<Ref<Resource>>('resource')
const activities = ref<Activity[]>([])
const activitiesLimit = 200

// Inside an unlocked vault the activity feed carries the encrypted blob names
// the server stores. Decrypt every resource-name variable in place so the
// feed reads like the user's cleartext file names. user/sharee are people and
// never encrypted; cleartext segments (the vault root, a parent folder) make
// decryptPath throw on the base32 decode, so we keep them as-is.
const decryptActivityNames = async (items: Activity[], engine: FolderVaultEngine) => {
  for (const activity of items) {
    const variables = activity.template?.variables as Record<string, any> | undefined
    if (!variables) {
      continue
    }
    for (const [key, value] of Object.entries(variables)) {
      if (key === 'user' || key === 'sharee' || !value) {
        continue
      }
      for (const field of ['name', 'displayName'] as const) {
        if (typeof value[field] !== 'string') {
          continue
        }
        try {
          // a resource name is a one-segment relative path
          value[field] = await engine.decryptPath(value[field])
        } catch {
          // not a vault-encrypted segment - leave it untouched
        }
      }
    }
  }
}

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
  const loaded = yield* call(
    clientService.graphAuthenticated.activities.listActivities(
      `itemid:${unref(resource).fileId} AND limit:${activitiesLimit} AND sort:desc`,
      { signal }
    )
  )

  // Only resolve the (possibly index-loading) engine and decrypt names when
  // the vault scheme actually encrypts names. A content-only scheme leaves
  // activity names in clear text, so there is nothing to decrypt and no need
  // to touch the engine at all. claimsPath is a cheap, sync, engine-free check.
  const res = unref(resource)
  const space = res ? getMatchingSpace(res) : null
  const claim = space ? getVaultClaim(extensionRegistry, space, res.path) : null
  if (claim?.encryptsNames) {
    const vaultEngine = yield* call(resolveFolderVault(extensionRegistry, space, res.path))
    if (vaultEngine) {
      yield* call(decryptActivityNames(loaded, vaultEngine))
    }
  }

  activities.value = loaded
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
    // FIXME: graph sdk type is wrong
    const entry = (activity.template.variables as Record<string, any>)[key]
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
