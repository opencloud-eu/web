<template>
  <div class="yjs-collaborators inline-flex items-center">
    <oc-button
      id="yjs-collaborators-trigger"
      v-oc-tooltip="label"
      type="button"
      appearance="raw"
      gap-size="none"
      class="yjs-collaborators-trigger rounded-full p-0.5"
      :aria-label="label"
      @mousedown.prevent
    >
      <oc-avatars
        :items="avatarItems"
        :width="24"
        :max-displayed="3"
        stacked
        class="yjs-collaborators-stack inline-flex"
      >
        <template #userAvatars="{ avatars }">
          <span
            v-for="(item, index) in avatars"
            :key="item.userId"
            class="yjs-collaborator-avatar relative inline-flex rounded-full border-2"
            :class="{ 'yjs-collaborator-avatar-followed': item.userId === followedUser?.id }"
            :style="{ borderColor: colorById[item.userId], zIndex: avatars.length - index }"
            :data-test-user-id="item.userId"
          >
            <user-avatar
              :user-id="item.userId"
              :user-name="item.displayName"
              :width="20"
              :background-color="colorById[item.userId]"
            />
            <span
              v-if="item.userId === followedUser?.id"
              class="yjs-collaborator-follow-badge absolute -right-1.5 -bottom-1.5 inline-flex size-4 items-center justify-center rounded-full border-2 border-role-surface"
              :style="{ backgroundColor: followedUser.color }"
            >
              <oc-icon name="focus-mode" fill-type="none" size="xsmall" color="#ffffff" />
            </span>
          </span>
        </template>
      </oc-avatars>
    </oc-button>
    <oc-drop
      drop-id="yjs-collaborators"
      toggle="#yjs-collaborators-trigger"
      :teleport="teleport"
      mode="click"
      position="bottom-end"
      padding-size="small"
      enforce-drop-on-mobile
      class="yjs-collaborators-drop"
    >
      <oc-list class="yjs-collaborators-list">
        <li
          v-for="user in users"
          :key="user.id"
          class="yjs-collaborators-item flex items-center gap-2 py-1"
          :class="{
            'yjs-collaborators-item-followed -mx-2 rounded-lg bg-role-secondary-container px-2':
              user.id === followedUser?.id
          }"
          :data-test-user-id="user.id"
        >
          <span
            class="inline-flex shrink-0 rounded-full border-2"
            :style="{ borderColor: user.color }"
          >
            <user-avatar
              :user-id="user.id"
              :user-name="user.name"
              :width="28"
              :background-color="user.color"
            />
          </span>
          <span class="min-w-0 flex-1 truncate" v-text="user.name" />
          <span
            v-if="user.isSelf"
            class="shrink-0 text-sm text-role-on-surface-variant"
            v-text="$gettext('(you)')"
          />
          <oc-button
            v-else-if="followingSupported"
            v-oc-tooltip="followActionLabel(user)"
            type="button"
            appearance="raw"
            size="small"
            class="yjs-collaborators-follow-toggle w-auto! shrink-0 rounded-full p-1!"
            :aria-label="followActionLabel(user)"
            :aria-pressed="user.id === followedUser?.id"
            @click="toggleFollow(user)"
          >
            <oc-icon
              name="focus-mode"
              fill-type="none"
              size="small"
              :color="user.id === followedUser?.id ? user.color : undefined"
            />
          </oc-button>
        </li>
      </oc-list>
    </oc-drop>
  </div>
</template>

<script setup lang="ts">
import { computed, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { YjsCollaborator } from '../../composables/yjs'
import UserAvatar from '../Avatars/UserAvatar.vue'

const {
  users,
  teleport = 'body',
  followingSupported = false,
  following = null
} = defineProps<{
  users: YjsCollaborator[]
  teleport?: string
  followingSupported?: boolean
  following?: string | null
}>()

const emit = defineEmits<{
  'update:following': [userId: string | null]
}>()

const { $gettext, $ngettext } = useGettext()

const followedUser = computed(() => {
  if (!followingSupported || !following) return null
  return users.find((user) => user.id === following && !user.isSelf) ?? null
})

const avatarUsers = computed(() => {
  const followed = unref(followedUser)
  if (!followed) return users
  const others = users.filter((user) => user.id !== followed.id)
  const firstPeerIndex = others.findIndex((user) => !user.isSelf)
  const insertAt = firstPeerIndex === -1 ? others.length : firstPeerIndex
  return [...others.slice(0, insertAt), followed, ...others.slice(insertAt)]
})

const avatarItems = computed(() =>
  unref(avatarUsers).map((user) => ({
    avatarType: 'user',
    userId: user.id,
    displayName: user.name
  }))
)
const colorById = computed(() => Object.fromEntries(users.map((user) => [user.id, user.color])))

const label = computed(() => {
  const count = $ngettext(
    '%{count} person in this editing session',
    '%{count} people in this editing session',
    users.length,
    { count: users.length.toString() }
  )
  const followed = unref(followedUser)
  if (!followed) return count
  return `${$gettext('Following %{name}', { name: followed.name })}. ${count}`
})

function followActionLabel(user: YjsCollaborator) {
  return user.id === unref(followedUser)?.id
    ? $gettext('Stop following %{name}', { name: user.name })
    : $gettext('Follow %{name}', { name: user.name })
}

function toggleFollow(user: YjsCollaborator) {
  emit('update:following', user.id === unref(followedUser)?.id ? null : user.id)
}

watch(
  () => followingSupported && following !== null && !unref(followedUser),
  (isStale) => {
    if (isStale) emit('update:following', null)
  },
  { immediate: true }
)
</script>
