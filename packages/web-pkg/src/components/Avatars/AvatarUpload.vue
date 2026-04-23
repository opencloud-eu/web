<template>
  <div>
    <input
      ref="fileInputRef"
      class="invisible avatar-file-input"
      type="file"
      accept="image/jpeg, image/png"
      @change="onFileChange"
    />
    <div class="flex flex-col items-center">
      <user-avatar class="mb-4" :width="128" :user-id="user.id" :user-name="user.displayName" />
      <div class="oc-button-group">
        <oc-button size="small" @click="triggerFileInput">
          {{ $gettext('Upload') }}
        </oc-button>
        <oc-button
          v-if="hasAvatar"
          class="avatar-upload-remove-button"
          size="small"
          @click="showRemoveModal = true"
        >
          {{ $gettext('Remove') }}
        </oc-button>
      </div>
    </div>
    <oc-modal
      v-if="showCropModal"
      :title="$gettext('Crop your new profile picture')"
      :button-cancel-text="$gettext('Cancel')"
      :button-confirm-text="$gettext('Set')"
      :button-confirm-disabled="!imageUrl"
      focus-trap-initial="#image-cropper-selection"
      @cancel="onCropModalCancel"
      @confirm="onCropModalConfirm"
    >
      <template #content>
        <image-cropper
          ref="imageCropperRef"
          :image-url="imageUrl"
          :aspect-ratio="1"
          rounded-selection
        />
      </template>
    </oc-modal>
    <oc-modal
      v-if="showRemoveModal"
      :message="$gettext('Are you sure you want to remove your profile picture?')"
      :title="$gettext('Remove profile picture')"
      :button-cancel-text="$gettext('Cancel')"
      :button-confirm-text="$gettext('Remove')"
      @cancel="showRemoveModal = false"
      @confirm="onRemoveModalConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref } from 'vue'
import { useAvatarsStore, useClientService, useMessages, useUserStore } from '../../composables'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import { AVATAR_UPLOAD_MAX_FILE_SIZE_MB } from '../../constants'
import UserAvatar from './UserAvatar.vue'
import ImageCropper from '../ImageCropper.vue'

const userStore = useUserStore()
const avatarsStore = useAvatarsStore()
const { avatarMap } = storeToRefs(avatarsStore)
const { user } = storeToRefs(userStore)

const { $gettext } = useGettext()
const { showErrorMessage, showMessage } = useMessages()
const { graphAuthenticated } = useClientService()

const imageUrl = ref<string | null>(null)
const imageCropperRef = ref<InstanceType<typeof ImageCropper> | null>(null)
const showCropModal = ref(false)
const showRemoveModal = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const maxFileSize = AVATAR_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024

const hasAvatar = computed(() => {
  return !!unref(avatarMap)[unref(user).id]
})

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }

  if (file.size > maxFileSize) {
    showErrorMessage({
      title: $gettext('File size exceeds the limit of %{size}MB', {
        size: AVATAR_UPLOAD_MAX_FILE_SIZE_MB.toString()
      })
    })
    return
  }

  imageUrl.value = URL.createObjectURL(file)
  showCropModal.value = true
}

const getCroppedImage = async () => {
  if (!unref(imageCropperRef)) {
    return null
  }
  return await unref(imageCropperRef).getCroppedCanvas(256, 256)
}

const getCanvasBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  return await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob as Blob), 'image/png')
  })
}

const triggerFileInput = () => {
  unref(fileInputRef).click()
}

const onCropModalCancel = () => {
  showCropModal.value = false
  destroyCropper()
}

const onCropModalConfirm = async () => {
  const croppedImage = await getCroppedImage()
  if (!croppedImage) {
    return
  }

  const blob = await getCanvasBlob(croppedImage)
  const objectUrl = URL.createObjectURL(blob)
  const file = new File([blob], 'avatar.png', {
    type: 'image/png',
    lastModified: Date.now()
  })

  try {
    await graphAuthenticated.photos.updateOwnUserPhotoPatch(file)
    avatarsStore.addAvatar(unref(user).id, objectUrl)
    showMessage({ title: $gettext('Profile picture was set successfully') })
  } catch (error) {
    showErrorMessage({
      title: $gettext('Failed to set profile picture'),
      errors: [error]
    })
  }

  showCropModal.value = false
  destroyCropper()
}

const onRemoveModalConfirm = async () => {
  try {
    await graphAuthenticated.photos.deleteOwnUserPhoto()
    avatarsStore.removeAvatar(unref(user).id)
    showMessage({ title: $gettext('Profile picture was removed successfully') })
  } catch (error) {
    showErrorMessage({
      title: $gettext('Failed to remove profile picture'),
      errors: [error]
    })
  }

  showRemoveModal.value = false
}

const destroyCropper = () => {
  if (unref(fileInputRef)) {
    fileInputRef.value.value = ''
  }

  imageUrl.value = null
}
</script>
