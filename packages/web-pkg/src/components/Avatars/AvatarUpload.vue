<template>
  <div
    :class="[
      '[&_.cropper-crop-box]:!outline-1',
      '[&_.cropper-crop-box]:!outline-role-outline',
      '[&_.cropper-view-box]:!rounded-[50%]',
      '[&_.cropper-crop-box]:!rounded-[50%]',
      '[&_.cropper-line]:!bg-role-outline',
      '[&_.cropper-point]:!bg-role-outline'
    ]"
  >
    <input
      ref="fileInputRef"
      class="invisible avatar-file-input"
      type="file"
      accept="image/jpeg, image/png"
      @change="onFileChange"
    />
    <div class="flex flex-col items-center">
      <user-avatar class="mb-4" :width="128" :user-id="user.id" :user-name="user.displayName" />
      <div>
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
    </div>
    <oc-modal
      v-if="showCropModal"
      :title="$gettext('Crop your new profile picture')"
      :button-cancel-text="$gettext('Cancel')"
      :button-confirm-text="$gettext('Set')"
      :button-confirm-disabled="!cropperReady"
      :focus-trap-initial="false"
      @cancel="onCropModalCancel"
      @confirm="onCropModalConfirm"
    >
      <template #content>
        <div v-if="imageUrl">
          <img ref="imageRef" class="max-h-[400px]" :src="imageUrl" />
          <div class="text-sm text-role-on-surface-variant flex items-center mt-1">
            <oc-icon class="mr-1" name="information" size="small" fill-type="line" />
            <span
              v-text="
                $gettext('Zoom via %{ zoomKeys }, pan via %{ panKeys }', {
                  zoomKeys: $gettext('+-'),
                  panKeys: $gettext('↑↓←→')
                })
              "
            />
          </div>
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
import { computed, nextTick, ref, unref, watch } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import {
  useAvatarsStore,
  useClientService,
  useCropperKeyboardActions,
  useMessages,
  useUserStore
} from '../../composables'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import { AVATAR_UPLOAD_MAX_FILE_SIZE_MB } from '../../constants'
import UserAvatar from './UserAvatar.vue'

const userStore = useUserStore()
const avatarsStore = useAvatarsStore()
const { avatarMap } = storeToRefs(avatarsStore)
const { user } = storeToRefs(userStore)

const { $gettext } = useGettext()
const { showErrorMessage, showMessage } = useMessages()
const { graphAuthenticated } = useClientService()
const { setCropperInstance } = useCropperKeyboardActions()

const imageUrl = ref<string | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const cropper = ref<Cropper | null>(null)
const cropperReady = ref(false)
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
    setCropperInstance(cropper)
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
  cropper.value?.destroy()
  cropper.value = null

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }

  imageUrl.value = null
}
</script>
