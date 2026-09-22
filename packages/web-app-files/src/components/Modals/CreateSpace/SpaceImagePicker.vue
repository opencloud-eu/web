<template>
  <div class="create-space-image">
    <span class="block mb-0.5" v-text="$gettext('Image')" />
    <div class="oc-button-group">
      <oc-button class="create-space-image-select" size="small" @click="fileInputRef?.click()">
        <oc-icon name="upload-cloud" fill-type="line" size-class="size-4" />
        {{ $gettext('Upload') }}
      </oc-button>
      <oc-button class="create-space-image-icon" size="small" @click="openIconPicker">
        <oc-icon name="emoji-sticker" fill-type="line" size-class="size-4" />
        {{ $gettext('Icon') }}
      </oc-button>
      <oc-button v-if="image" class="create-space-image-clear" size="small" @click="image = null">
        <oc-icon name="delete-bin" fill-type="line" size-class="size-4" />
        {{ $gettext('Remove') }}
      </oc-button>
    </div>
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg, image/png"
      tabindex="-1"
      hidden
      @change="onFileSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { markRaw, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import { EmojiPickerModal, emojiToImage, SpaceImageModal, useModals } from '@opencloud-eu/web-pkg'

const image = defineModel<ArrayBuffer>({ default: null })

const { $gettext } = useGettext()
const { dispatchModal } = useModals()

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')

function openIconPicker() {
  dispatchModal({
    elementClass: 'w-auto',
    title: $gettext('Set icon'),
    hideActions: true,
    customComponent: markRaw(EmojiPickerModal),
    focusTrapInitial: false,
    onConfirm: async (emoji: string) => {
      image.value = (await emojiToImage(emoji)) as ArrayBuffer
    }
  })
}

function onFileSelected(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  // Reset, so picking the same file again opens the cropper once more.
  input.value = ''

  if (!file) {
    return
  }

  dispatchModal({
    title: $gettext('Crop image'),
    confirmText: $gettext('Confirm'),
    focusTrapInitial: '#image-cropper-selection',
    customComponent: markRaw(SpaceImageModal),
    customComponentAttrs: () => ({
      file,
      save: (content: ArrayBuffer) => {
        image.value = content
      }
    })
  })
}
</script>
