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
    <span v-else class="avatar-initials" :style="{ color }">{{ userInitial }}</span>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, unref } from 'vue'
import OcImage from '../OcImage/OcImage.vue'
import { extractInitials } from './extractInitials'

export interface Props {
  /**
   * @docs The accessible label for the avatar. Only needed in case the avatar is used alone. If not specified, the avatar will get `aria-hidden="true"`.
   */
  accessibleLabel?: string
  color?: string
  backgroundColor?: string
  /**
   * @docs The source of the image to be displayed.
   */
  src?: string
  /**
   * @docs The user name to extract the initials from if `src` is empty.
   */
  userName?: string
  /**
   * @docs The width of the avatar.
   * @default 50
   */
  width?: number
}

const {
  accessibleLabel = '',
  backgroundColor,
  color = 'white',
  src = '',
  userName = '',
  width = 50
} = defineProps<Props>()

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
  if (unref(backgroundColor)) {
    return backgroundColor
  }
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
}
</style>
