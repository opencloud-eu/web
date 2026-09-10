<template>
  <div class="text-editor-toolbar-collaborators inline-flex items-center">
    <oc-button
      id="toolbar-collaborators-trigger"
      v-oc-tooltip="label"
      type="button"
      appearance="raw"
      gap-size="none"
      class="text-editor-toolbar-collaborators-trigger rounded-full p-0.5"
      :aria-label="label"
      @mousedown.prevent
    >
      <oc-avatars
        :items="avatarItems"
        :width="24"
        :max-displayed="3"
        stacked
        class="text-editor-collaborators-stack inline-flex"
      >
        <template #userAvatars="{ avatars }">
          <span
            v-for="(item, index) in avatars"
            :key="item.userId"
            class="text-editor-collaborator-avatar relative inline-flex rounded-full border-2"
            :style="{ borderColor: colorById[item.userId], zIndex: avatars.length - index }"
            :data-test-user-id="item.userId"
          >
            <user-avatar
              :user-id="item.userId"
              :user-name="item.displayName"
              :width="20"
              :background-color="colorById[item.userId]"
            />
          </span>
        </template>
      </oc-avatars>
    </oc-button>
    <oc-drop
      drop-id="toolbar-collaborators"
      toggle="#toolbar-collaborators-trigger"
      :teleport="teleport"
      mode="click"
      position="bottom-end"
      padding-size="small"
      enforce-drop-on-mobile
      class="text-editor-toolbar-collaborators-drop"
    >
      <oc-list class="text-editor-collaborators-list">
        <li
          v-for="user in users"
          :key="user.id"
          class="text-editor-collaborators-item flex items-center gap-2 py-1"
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
          <span class="truncate" v-text="user.name" />
          <span
            v-if="user.isSelf"
            class="shrink-0 text-sm text-role-on-surface-variant"
            v-text="$gettext('(you)')"
          />
        </li>
      </oc-list>
    </oc-drop>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { YjsCollaborator } from '../../composables/yjs'
import UserAvatar from '../../components/Avatars/UserAvatar.vue'

const { users, teleport = 'body' } = defineProps<{
  users: YjsCollaborator[]
  teleport?: string
}>()

const { $gettext, $ngettext } = useGettext()

const avatarItems = computed(() =>
  users.map((user) => ({ avatarType: 'user', userId: user.id, displayName: user.name }))
)
const colorById = computed(() => Object.fromEntries(users.map((user) => [user.id, user.color])))

const label = computed(() =>
  $ngettext(
    '%{count} person in this editing session',
    '%{count} people in this editing session',
    users.length,
    { count: users.length.toString() }
  )
)
</script>
