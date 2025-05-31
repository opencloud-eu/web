<template>
  <oc-avatar :user-name="userName" :src="avatarSrc" :width="36" />
</template>

<script setup lang="ts">
import { computed, onMounted, unref } from 'vue'
import { useAvatarsStore, useLoadAvatars } from '../../composables'
import { storeToRefs } from 'pinia'

const { userId } = defineProps<{
  userId: string
  userName: string
}>()

const avatarsStore = useAvatarsStore()
const { avatarMap } = storeToRefs(avatarsStore)
const { enqueueAvatar } = useLoadAvatars()

const avatarSrc = computed(() => {
  return unref(avatarMap)[userId]
})

onMounted(() => {
  enqueueAvatar(userId)
})
</script>
