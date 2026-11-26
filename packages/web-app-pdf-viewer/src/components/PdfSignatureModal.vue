<template>
  <div class="pdf-viewer-signature flex flex-col gap-3">
    <div
      class="oc-button-group w-full"
      role="tablist"
      :aria-label="$gettext('Signature')"
      @keydown.left.prevent="moveTab(-1)"
      @keydown.right.prevent="moveTab(1)"
    >
      <oc-button
        v-for="tab in tabs"
        :id="`pdf-viewer-signature-tab-${tab.id}`"
        :key="tab.id"
        :class="[
          `pdf-viewer-signature-tab-${tab.id}`,
          'flex-1 justify-center px-2.5 py-1.5 text-sm'
        ]"
        :aria-selected="activeTab === tab.id"
        aria-controls="pdf-viewer-signature-panel"
        :tabindex="activeTab === tab.id ? 0 : -1"
        role="tab"
        :appearance="activeTab === tab.id ? 'filled' : 'raw'"
        :color-role="activeTab === tab.id ? 'secondaryContainer' : 'secondary'"
        :no-hover="activeTab === tab.id"
        @click="selectTab(tab.id)"
      >
        <span v-text="tab.label" />
      </oc-button>
    </div>

    <div
      id="pdf-viewer-signature-panel"
      class="relative flex h-56 flex-col rounded-sm border border-role-outline-variant bg-role-surface text-role-on-surface has-[input:focus-visible]:border-role-outline"
      role="tabpanel"
      :aria-labelledby="`pdf-viewer-signature-tab-${activeTab}`"
    >
      <pdf-signature-draw v-if="activeTab === 'draw'" v-model="drawnCurves" />
      <oc-text-input
        v-else-if="activeTab === 'type'"
        id="pdf-viewer-signature-name"
        ref="typeInput"
        v-model="typedText"
        class="pdf-viewer-signature-type my-auto px-8"
        :label="$gettext('Your name')"
        :placeholder="$gettext('Your name')"
        :has-border="false"
      >
        <template #label>
          <label class="sr-only" for="pdf-viewer-signature-name" v-text="$gettext('Your name')" />
        </template>
      </oc-text-input>
      <pdf-signature-image
        v-else
        ref="signatureImage"
        v-model:data="imageData"
        v-model:file-name="imageName"
        :get-from-image="getFromImage"
      />
      <oc-button
        v-if="activeTab === 'image' && !imageData && pickImageFromCloud"
        class="pdf-viewer-signature-image-cloud mx-8 mb-4 self-start"
        appearance="raw"
        no-hover
        @click="pickImageFromCloud((file) => signatureImage?.useImage(file))"
      >
        <oc-icon name="cloud" fill-type="line" size-class="size-4" />
        <span v-text="$gettext('Or pick from cloud')" />
      </oc-button>
    </div>
    <p
      v-if="signatureError"
      class="pdf-viewer-signature-error text-sm text-role-error"
      role="alert"
      v-text="signatureError"
    />
    <oc-text-input
      v-model="description"
      class="pdf-viewer-signature-description"
      :label="$gettext('Description (alt text)')"
      :disabled="!hasSignature"
      clear-button-enabled
    />
    <div class="flex justify-end">
      <oc-switch
        v-model:checked="isSaved"
        class="pdf-viewer-signature-save inline-flex"
        :label="$gettext('Save signature')"
        :disabled="!hasSignature || !canSave"
      >
        <oc-contextual-helper
          v-if="!canSave"
          :title="$gettext('Save signature')"
          :text="
            $gettext(
              'You’ve reached the limit of %{max} saved signatures. Remove one to save more.',
              { max: String(MAX_SIGNATURES) }
            )
          "
        />
        <oc-contextual-helper
          v-else
          :title="$gettext('Save signature')"
          :text="
            $gettext(
              'Saved signatures are only kept while the PDF viewer is open. They are gone once you close it.'
            )
          "
        />
      </oc-switch>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, shallowRef, unref, useTemplateRef, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Modal } from '@opencloud-eu/web-pkg'
import type { OcTextInput } from '@opencloud-eu/design-system/components'
import PdfSignatureImage from './PdfSignatureImage.vue'
import PdfSignatureDraw from './PdfSignatureDraw.vue'
import type { DrawnCurves, SignatureData } from '../composables/usePdfSignature'
import { MAX_SIGNATURES } from '../composables/usePdfSignatureStorage'

const {
  getDrawnSignature,
  getFromText,
  getFromImage,
  onSave,
  canSave = false,
  pickImageFromCloud = undefined
} = defineProps<{
  modal: Modal
  /** There's room to save the signature for reuse. */
  canSave?: boolean
  getDrawnSignature: (curves: DrawnCurves) => SignatureData | null
  getFromText: (text: string, style: CSSStyleDeclaration) => SignatureData | null
  getFromImage: (file: File) => Promise<SignatureData | null>
  onSave: (data: SignatureData, description: string, isSaved: boolean) => Promise<void> | void
  /** An image of the signature from the cloud, like images of annotations. */
  pickImageFromCloud?: (onImage: (file: File) => void) => void
}>()

const isSaved = ref(canSave)
const signatureImage = useTemplateRef<InstanceType<typeof PdfSignatureImage>>('signatureImage')

const emit = defineEmits<{ 'update:confirmDisabled': [value: boolean] }>()

const { $gettext, $pgettext } = useGettext()

type Tab = 'draw' | 'type' | 'image'
const tabs = computed<{ id: Tab; label: string }[]>(() => [
  { id: 'type', label: $pgettext('Signature tab', 'Type') },
  { id: 'draw', label: $pgettext('Signature tab', 'Draw') },
  { id: 'image', label: $pgettext('Signature tab', 'Image') }
])
// Same order and first tab as in the PDF.js viewer.
const activeTab = ref<Tab>('type')

const drawnCurves = ref<DrawnCurves>()

// Type: PDF.js turns the text into an outline using the font of the input.
const typeInput = useTemplateRef<InstanceType<typeof OcTextInput>>('typeInput')
const typedText = ref('')

async function selectTab(tab: Tab) {
  activeTab.value = tab
  // Ready to type the name.
  if (tab === 'type') {
    await nextTick()
    unref(typeInput)?.focus()
  }
}

/** Arrow keys switch tabs, like in tab lists elsewhere. */
async function moveTab(step: number) {
  const ids = unref(tabs).map(({ id }) => id)
  const index = (ids.indexOf(unref(activeTab)) + step + ids.length) % ids.length
  activeTab.value = ids[index]
  await nextTick()
  document.getElementById(`pdf-viewer-signature-tab-${ids[index]}`)?.focus()
}

// Image: PDF.js extracts the signature from the picture, see PdfSignatureImage.
// shallowRef: PDF.js objects use private fields, which don't work through Vue's proxies.
const imageData = shallowRef<SignatureData | null>(null)
const imageName = ref('')
const signatureError = ref('')

const hasSignature = computed(() => {
  switch (unref(activeTab)) {
    case 'draw':
      return !!unref(drawnCurves)?.curves.length
    case 'type':
      return !!unref(typedText).trim()
    default:
      return !!unref(imageData)
  }
})

watch(hasSignature, (value) => emit('update:confirmDisabled', !value), { immediate: true })

function getSignatureData() {
  switch (unref(activeTab)) {
    case 'draw':
      return getDrawnSignature(unref(drawnCurves))
    case 'type': {
      const input = unref(typeInput)?.$el.querySelector('input')
      return getFromText(unref(typedText).trim(), window.getComputedStyle(input))
    }
    default:
      return unref(imageData)
  }
}

// Read out by screen readers instead of the signature and shown with saved signatures. Each tab
// has its own, by default like in the PDF.js viewer until the user changes it.
const editedDescriptions = reactive<Partial<Record<Tab, string>>>({})

function getDefaultDescription(tab: Tab) {
  switch (tab) {
    case 'type':
      return unref(typedText).trim()
    case 'image':
      return unref(imageName)
    default:
      return unref(drawnCurves) ? $gettext('Signature') : ''
  }
}

// Back at the default, it follows again, like in the PDF.js viewer. Cleared, it stays empty.
const description = computed({
  get: () => editedDescriptions[unref(activeTab)] ?? getDefaultDescription(unref(activeTab)),
  // The clear button of the input sets null.
  set: (value: string | null) => {
    const tab = unref(activeTab)
    if (value === getDefaultDescription(tab)) {
      delete editedDescriptions[tab]
      return
    }
    editedDescriptions[tab] = value ?? ''
  }
})

async function onConfirm() {
  const data = getSignatureData()
  if (!data) {
    // E.g. a font that draws nothing. Throwing keeps the dialog open.
    signatureError.value = $gettext('No signature could be created from this, please try again.')
    throw new Error('No signature data')
  }
  await onSave(data, unref(description).trim(), unref(isSaved) && canSave)
}

// A new drawing or image gets the default description again if it was cleared, like in the
// PDF.js viewer.
watch(
  () => !!unref(drawnCurves),
  (hasDrawing) => {
    if (hasDrawing && editedDescriptions.draw === '') {
      delete editedDescriptions.draw
    }
  }
)
watch(imageData, (data) => {
  if (data && editedDescriptions.image === '') {
    delete editedDescriptions.image
  }
})

watch([activeTab, () => unref(drawnCurves)?.curves.length, typedText], () => {
  signatureError.value = ''
})

defineExpose({ onConfirm })
</script>

<style scoped>
/*
 * PDF.js turns a typed signature into an outline using the font of this input, so it gets the
 * same handwriting fonts as in the PDF.js viewer instead of the OpenCloud UI font.
 */
.pdf-viewer-signature-type :deep(input) {
  font-family:
    'Brush script', 'Apple Chancery', 'Segoe script', 'Freestyle Script', 'Palace Script MT',
    'Brush Script MT', TK, cursive, serif;
  font-size: 1.75rem;
  font-style: italic;
  height: 4rem;
  text-align: center;
}
</style>
