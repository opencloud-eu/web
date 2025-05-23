<template>
  <div class="avatar-upload">
    <input
      ref="fileInputRef"
      class="oc-invisible"
      type="file"
      accept="image/jpeg, image/png"
      @change="onFileChange"
    />
    <div class="oc-flex oc-flex-column oc-flex-middle">
      <oc-avatar
        class="oc-mb-m"
        :width="128"
        :userid="user.onPremisesSamAccountName"
        :user-name="user.displayName"
        :src="userAvatar"
      />
      <div>
        <div class="oc-button-group">
          <oc-button size="small" @click="triggerFileInput">
            {{ $gettext('Upload') }}
          </oc-button>
          <oc-button v-if="userAvatar" size="small" @click="showRemoveModal = true">
            {{ $gettext('Remove') }}
          </oc-button>
        </div>
      </div>
    </div>
    <oc-modal
      v-if="showCropModal"
      :title="$gettext('Crop your new profile picture')"
      :button-cancel-text="$gettext('Cancel')"
      :button-confirm-text="$gettext('Set')"
      :button-confirm-disabled="!cropperReady"
      @cancel="onCropModalCancel"
      @confirm="onCropModalConfirm"
    >
      <template #content>
        <div v-if="imageUrl">
          <img ref="imageRef" class="avatar-upload-modal-image" :src="imageUrl" />
        </div>
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
import { nextTick, ref, watch } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { useAvatarsStore, useClientService, useMessages, useUserStore } from '../composables'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import { AVATAR_UPLOAD_MAX_FILE_SIZE_MB } from '../constants'

const userStore = useUserStore()
const avatarsStore = useAvatarsStore()
const { user } = storeToRefs(userStore)
const { userAvatar } = storeToRefs(avatarsStore)

const { $gettext } = useGettext()
const { showErrorMessage, showMessage } = useMessages()
const { graphAuthenticated } = useClientService()

const imageUrl = ref<string | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const cropper = ref<Cropper | null>(null)
const cropperReady = ref(false)
const showCropModal = ref(false)
const showRemoveModal = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const maxFileSize = AVATAR_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

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

watch(imageUrl, async (newVal) => {
  if (!newVal) return

  await nextTick()

  if (cropper.value) {
    cropper.value.destroy()
  }

  if (imageRef.value) {
    cropper.value = new Cropper(imageRef.value, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.8,
      responsive: true,
      background: false,
      ready() {
        cropperReady.value = true
      }
    })
  }
})

const getCroppedImage = () => {
  return cropper.value!.getCroppedCanvas({
    width: 256,
    height: 256,
    imageSmoothingQuality: 'high'
  })
}

const getCanvasBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  return await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob as Blob), 'image/png')
  })
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const onCropModalCancel = () => {
  showCropModal.value = false
  destroyCropper()
}

const onCropModalConfirm = async () => {
  const croppedImage = getCroppedImage()
  const blob = await getCanvasBlob(croppedImage)
  const objectUrl = URL.createObjectURL(blob)
  const file = new File([blob], 'avatar.png', {
    type: 'image/png',
    lastModified: Date.now()
  })

  try {
    await graphAuthenticated.photos.updateOwnUserPhotoPatch(file)
    avatarsStore.setUserAvatar(objectUrl)
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
    avatarsStore.removeUserAvatar()
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
  cropper.value?.destroy()
  cropper.value = null

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }

  imageUrl.value = null
}
</script>

<style lang="scss">
.avatar-upload {
  &-modal-image {
    max-height: 400px;
  }

  .cropper-crop-box,
  .cropper-view-box {
    border-radius: 50%;
  }

  .cropper-view-box {
    box-shadow: 0 0 0 1px #39f;
    outline: 0;
  }
}
</style>
