<template>
  <oc-avatar :user-name="userName" :src="avatarSrc" :width="width" />
</template>

<script setup lang="ts">
import { computed, onUnmounted, unref, watch } from 'vue'
import { useAvatarsStore, useLoadAvatars } from '../../composables'
import { storeToRefs } from 'pinia'

const {
  userId,
  userName,
  width = 36
} = defineProps<{
  userId: string
  userName: string
  width?: number
}>()

const avatarsStore = useAvatarsStore()
const { avatarMap } = storeToRefs(avatarsStore)
const { enqueueAvatar, cancelAvatar } = useLoadAvatars()

const avatarSrc = computed(() => {
  return unref(avatarMap)[userId]
})

watch(
  () => userId,
  (newUserId, oldUserId) => {
    if (oldUserId) {
      cancelAvatar(oldUserId)
    }
    enqueueAvatar(newUserId)
  },
  { immediate: true }
)

onUnmounted(() => {
  cancelAvatar(userId)
})
</script>
