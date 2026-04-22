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
      focus-trap-initial="#avatar-upload-cropper-selection"
      @cancel="onCropModalCancel"
      @confirm="onCropModalConfirm"
    >
      <template #content>
        <cropper-canvas ref="cropperCanvasRef" background style="height: 400px" wheelable>
          <cropper-image
            ref="cropperImageRef"
            rotatable
            scalable
            skewable
            translatable
            wheelable
            :src="imageUrl"
            @transform="onCropperImageTransform"
          />
          <cropper-shade hidden />
          <cropper-handle action="select" plain />
          <cropper-selection
            id="avatar-upload-cropper-selection"
            ref="cropperSelectionRef"
            tabindex="0"
            data-custom-key-bindings-disabled="true"
            initial-coverage="0.8"
            aspect-ratio="1"
            movable
            resizable
            outlined
            class="rounded-full focus:!ring-0 focus:!outline outline-role-outline focus:!outline-role-outline"
            @change="onCropperSelectionChange"
          >
            <cropper-grid role="grid" bordered covered />
            <cropper-crosshair centered />
            <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)" />
            <cropper-handle theme-color="#70787c" action="n-resize" />
            <cropper-handle theme-color="#70787c" action="e-resize" />
            <cropper-handle theme-color="#70787c" action="s-resize" />
            <cropper-handle theme-color="#70787c" action="w-resize" />
            <cropper-handle theme-color="#70787c" action="ne-resize" />
            <cropper-handle theme-color="#70787c" action="nw-resize" />
            <cropper-handle theme-color="#70787c" action="se-resize" />
            <cropper-handle theme-color="#70787c" action="sw-resize" />
          </cropper-selection>
        </cropper-canvas>
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
import { computed, ref, unref, watch } from 'vue'
import 'cropperjs'
import {
  useAvatarsStore,
  useClientService,
  useMessages,
  useUserStore,
  useCropperKeyboardActions
} from '../../composables'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import { AVATAR_UPLOAD_MAX_FILE_SIZE_MB } from '../../constants'
import UserAvatar from './UserAvatar.vue'
import type {
  CropperSelection,
  CropperImage as CropperImageType,
  CropperCanvas as CropperCanvasType
} from 'cropperjs'

interface Selection {
  x: number
  y: number
  width: number
  height: number
}

const userStore = useUserStore()
const avatarsStore = useAvatarsStore()
const { avatarMap } = storeToRefs(avatarsStore)
const { user } = storeToRefs(userStore)

const { $gettext } = useGettext()
const { showErrorMessage, showMessage } = useMessages()
const { graphAuthenticated } = useClientService()
const { setCropperInstance } = useCropperKeyboardActions()

const imageUrl = ref<string | null>(null)
const cropperCanvasRef = ref<CropperCanvasType | null>(null)
const cropperImageRef = ref<CropperImageType | null>(null)
const cropperSelectionRef = ref<CropperSelection | null>(null)
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
  if (!unref(cropperSelectionRef)) {
    return null
  }
  return await unref(cropperSelectionRef).$toCanvas({
    width: 256,
    height: 256
  })
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

const inSelection = (selection: Selection, maxSelection: Selection) => {
  return (
    selection.x >= maxSelection.x &&
    selection.y >= maxSelection.y &&
    selection.x + selection.width <= maxSelection.x + maxSelection.width &&
    selection.y + selection.height <= maxSelection.y + maxSelection.height
  )
}

const onCropperImageTransform = (event: CustomEvent) => {
  const cropperCanvas = unref(cropperCanvasRef)
  if (!cropperCanvas) {
    return
  }

  const cropperSelection = unref(cropperSelectionRef)
  if (!cropperSelection) {
    return
  }

  const cropperCanvasRect = cropperCanvas.getBoundingClientRect()
  const selection = cropperSelection as Selection
  const maxSelection: Selection = {
    x: 0,
    y: 0,
    width: cropperCanvasRect.width,
    height: cropperCanvasRect.height
  }

  if (!inSelection(selection, maxSelection)) {
    event.preventDefault()
  }
}

const onCropperSelectionChange = (event: CustomEvent) => {
  const cropperCanvas = unref(cropperCanvasRef)
  if (!cropperCanvas) {
    return
  }

  const cropperCanvasRect = cropperCanvas.getBoundingClientRect()
  const selection = event.detail as Selection
  const maxSelection: Selection = {
    x: 0,
    y: 0,
    width: cropperCanvasRect.width,
    height: cropperCanvasRect.height
  }

  if (!inSelection(selection, maxSelection)) {
    event.preventDefault()
  }
}

watch(cropperSelectionRef, (cropper) => {
  if (cropper) {
    setCropperInstance(cropperSelectionRef, cropperImageRef)
  }
})
</script>
