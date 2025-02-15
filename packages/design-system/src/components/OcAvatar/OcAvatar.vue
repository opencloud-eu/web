<template>
  <span
    class="vue-avatar--wrapper oc-avatar"
    :style="style"
    :width="width"
    :aria-label="accessibleLabel === '' ? null : accessibleLabel"
    :aria-hidden="accessibleLabel === '' ? 'true' : null"
    :focusable="accessibleLabel === '' ? 'false' : null"
    :role="accessibleLabel === '' ? null : 'img'"
    :data-test-user-name="userName"
  >
    <oc-image v-if="isImage" loading-type="lazy" class="avatarImg" :src="src" @error="onImgError" />
    <span v-else class="avatarInitials">{{ userInitial }}</span>
  </span>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import OcImage from '../OcImage/OcImage.vue'
import { extractInitials } from './extractInitials'

export interface Props {
  accessibleLabel?: string
  src?: string
  userName?: string
  width?: number
}

const { accessibleLabel = '', src = '', userName = '', width = 50 } = defineProps<Props>()

const backgroundColors = [
  '#b82015',
  '#c21c53',
  '#9C27B0',
  '#673AB7',
  '#3F51B5',
  '#106892',
  '#055c68',
  '#208377',
  '#1a761d',
  '#476e1a',
  '#636d0b',
  '#8e5c11',
  '#795548',
  '#465a64'
]

const imgError = ref(false)

const isImage = computed(() => !imgError.value && Boolean(src))

const background = computed(() => {
  if (!isImage.value) {
    return randomBackgroundColor(userName.length, backgroundColors)
  }
  return ''
})

const style = computed(() => {
  const style = {
    width: `${width}px`,
    height: `${width}px`,
    lineHeight: `${width}px`
  }

  const initialBackgroundAndFontStyle = {
    backgroundColor: background.value,
    fontSize: `${Math.floor(width / 2.5)}px`,
    fontFamily: 'Helvetica, Arial, sans-serif',
    color: 'white'
  }

  Object.assign(style, initialBackgroundAndFontStyle)

  return style
})

const userInitial = computed(() => {
  if (!isImage.value) {
    return extractInitials(userName)
  }
  return ''
})

const onImgError = () => {
  imgError.value = true
}

const randomBackgroundColor = (seed: number, colors: string[]) => {
  return colors[seed % colors.length]
}
</script>

<style lang="scss">
.oc-avatar {
  font-weight: normal;
  align-items: center;
  justify-content: center;
  text-align: center;
  user-select: none;
  display: flex;
  border-radius: 50%;

  .avatarImg {
    width: 100%;
    height: auto;
    border-radius: 50%;
  }

  .avatarInitials {
    color: white !important;
  }
}
</style>
