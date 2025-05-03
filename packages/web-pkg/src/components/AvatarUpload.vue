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
          <oc-button v-if="userAvatar" size="small" @click="removeImage">
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
      @cancel="onModalCancel"
      @confirm="onModalConfirm"
    >
      <template #content>
        <div v-if="imageUrl">
          <img ref="imageRef" class="avatar-upload-modal-image" :src="imageUrl" />
        </div>
      </template>
    </oc-modal>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, nextTick, useTemplateRef, unref } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { useAvatarsStore, useMessages, useUserStore } from '../composables'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'AvatarUpload',
  setup() {
    const userStore = useUserStore()
    const { $gettext } = useGettext()
    const avatarsStore = useAvatarsStore()
    const { showErrorMessage, showMessage } = useMessages()

    const { user } = storeToRefs(userStore)
    const { userAvatar } = storeToRefs(avatarsStore)

    const imageUrl = ref(null)
    const imageRef = ref(null)
    const cropper = ref(null)
    const cropperReady = ref(false)
    const showCropModal = ref(false)
    const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
    const maxFileSize = 10 * 1024 * 1024 // 10MB

    function onFileChange(event) {
      const file = event.target.files[0]

      if (!file) {
        return
      }

      if (file.size > maxFileSize) {
        return showErrorMessage({
          title: $gettext('File size exceeds the limit of 10MB')
        })
      }

      imageUrl.value = URL.createObjectURL(file)
      showCropModal.value = true
    }

    watch(imageUrl, async () => {
      if (!unref(imageUrl)) {
        return
      }
      await nextTick()

      if (unref(cropper)) {
        unref(cropper).destroy()
      }

      cropper.value = new Cropper(unref(imageRef), {
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
    })

    const getCroppedImage = () => {
      return unref(cropper).getCroppedCanvas({
        width: 256,
        height: 256,
        imageSmoothingQuality: 'high'
      })
    }

    const triggerFileInput = () => {
      unref(fileInputRef).click()
    }

    const onModalCancel = () => {
      showCropModal.value = false
      destroyCropper()
    }

    const onModalConfirm = async () => {
      const croppedImage = getCroppedImage()
      const objectUrl = await getCanvasBlobUrl(croppedImage)

      //TODO: SEND TO SERVER

      avatarsStore.setUserAvatar(objectUrl)

      showCropModal.value = false
      destroyCropper()

      showMessage({ title: $gettext('Profile picture was set successfully') })
    }

    const getCanvasBlobUrl = async (canvas: HTMLCanvasElement) => {
      const blob = (await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))) as Blob
      return URL.createObjectURL(blob)
    }

    const removeImage = () => {
      avatarsStore.removeUserAvatar()
    }

    const destroyCropper = () => {
      if (unref(cropper)) {
        unref(cropper).destroy()
        cropper.value = null
      }

      unref(fileInputRef).value = ''
      imageUrl.value = null
    }

    return {
      imageUrl,
      imageRef,
      cropperReady,
      onFileChange,
      showCropModal,
      onModalCancel,
      onModalConfirm,
      triggerFileInput,
      fileInputRef,
      removeImage,
      user,
      userAvatar
    }
  }
})
</script>

<style lang="scss">
.avatar-upload {
  &-modal-image {
    width: 300px;
    height: 300px;
    object-fit: cover;
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
