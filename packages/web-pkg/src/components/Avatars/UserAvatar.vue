<template>
  <oc-avatar :user-name="userName" :src="avatarSrc" :width="36" />
</template>

<script setup lang="ts">
import { computed, onMounted, unref, ref } from 'vue'
import { useAvatarsStore, useClientService } from '../../composables'
import { storeToRefs } from 'pinia'

const { userId } = defineProps<{
  userId: string
  userName: string
}>()

const avatarsStore = useAvatarsStore()
const { avatarMap } = storeToRefs(avatarsStore)
const clientService = useClientService()

const loading = ref(true)

const avatarSrc = computed(() => {
  return unref(avatarMap)[userId]
})

const loadAvatar = async () => {
  if (unref(avatarMap).hasOwnProperty(userId)) {
    return false
  }
  try {
    const avatar = await clientService.graphAuthenticated.photos.getUserPhoto(userId, {
      responseType: 'blob'
    })
    avatarsStore.addAvatar(userId, URL.createObjectURL(avatar))
  } catch {
    avatarsStore.addAvatar(userId, null)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAvatar()
})
</script>
