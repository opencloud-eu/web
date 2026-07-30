<template>
  <oc-drop
    ref="dropRef"
    mode="manual"
    position="bottom-start"
    :padding-size="isActionView ? 'xsmall' : 'small'"
    teleport="body"
    enforce-drop-on-mobile
    :is-menu="false"
    class="text-editor-link-panel z-10001 box-border max-w-[calc(100vw-10px)]! overflow-hidden!"
    :class="isActionView ? 'w-auto! rounded-md!' : 'w-[min(20rem,calc(100vw-10px))]!'"
    @hide-drop="onDropHide"
  >
    <div
      v-if="isActionView"
      ref="actionRowRef"
      tabindex="-1"
      class="text-editor-link-panel-actions box-border inline-flex flex-nowrap items-center focus:outline-none! focus:shadow-none!"
      @keydown.esc.stop.prevent="closePanel(false)"
    >
      <oc-button
        appearance="raw"
        gap-size="small"
        class="h-8 shrink-0 justify-center px-2 py-0"
        :aria-label="$gettext('Edit Link')"
        @click="editLink"
      >
        <oc-icon name="edit-2" fill-type="line" size="small" />
        <span>{{ $gettext('Edit Link') }}</span>
      </oc-button>
      <div
        role="separator"
        aria-orientation="vertical"
        class="h-5 w-px shrink-0 bg-role-outline-variant"
      />
      <oc-button
        v-oc-tooltip="$gettext('Open link in a new tab')"
        appearance="raw"
        class="h-8 w-8 shrink-0 justify-center p-0"
        :aria-label="$gettext('Open link in a new tab')"
        :disabled="!actionUrl"
        @click="openLink"
      >
        <oc-icon name="external-link" fill-type="line" size="small" />
      </oc-button>
      <div
        role="separator"
        aria-orientation="vertical"
        class="h-5 w-px shrink-0 bg-role-outline-variant"
      />
      <oc-button
        v-oc-tooltip="$gettext('Unlink')"
        appearance="raw"
        class="h-8 w-8 shrink-0 justify-center p-0"
        :aria-label="$gettext('Unlink')"
        @click="removeLink"
      >
        <oc-icon name="link-unlink" size="small" fill-type="none" />
      </oc-button>
    </div>
    <form
      v-else
      class="text-editor-link-panel-edit box-border flex w-full min-w-0 max-w-full flex-col gap-1 overflow-hidden"
      :aria-label="$gettext('Edit link')"
      @submit.prevent
      @keydown.enter="onEnter"
      @keydown.esc.stop.prevent="closePanel(false)"
    >
      <div
        class="text-editor-link-panel-input-row flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden"
      >
        <oc-icon name="link" fill-type="line" size="small" class="shrink-0" />
        <div class="text-editor-link-panel-input min-w-0 flex-1 overflow-hidden">
          <oc-text-input
            :id="urlInputId"
            ref="urlInputRef"
            v-model="url"
            class="w-full min-w-0 max-w-full overflow-hidden"
            :label="$gettext('URL')"
            :placeholder="$gettext('Paste link')"
          >
            <template #label>
              <label :for="urlInputId" class="sr-only">{{ $gettext('URL') }}</label>
            </template>
          </oc-text-input>
        </div>
      </div>
      <div
        class="text-editor-link-panel-input-row flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden"
      >
        <oc-icon name="text" fill-type="none" size="small" class="shrink-0" />
        <div class="text-editor-link-panel-input min-w-0 flex-1 overflow-hidden">
          <oc-text-input
            :id="textInputId"
            v-model="text"
            class="w-full min-w-0 max-w-full overflow-hidden"
            :label="$gettext('Text to display')"
            :placeholder="$gettext('Text to display')"
          >
            <template #label>
              <label :for="textInputId" class="sr-only">{{ $gettext('Text to display') }}</label>
            </template>
          </oc-text-input>
        </div>
      </div>
    </form>
  </oc-drop>
</template>

<script setup lang="ts">
import {
  ComponentPublicInstance,
  computed,
  inject,
  nextTick,
  ref,
  unref,
  useId,
  useTemplateRef,
  watch
} from 'vue'
import { OcButton, OcDrop, OcIcon, OcTextInput } from '@opencloud-eu/design-system/components'
import { useGettext } from 'vue3-gettext'
import type { TextEditorInstance } from '../types'
import { normalizeLinkUrl } from '../extensions'

interface VirtualElement {
  getBoundingClientRect(): DOMRect
}

const { editor = undefined } = defineProps<{
  editor?: TextEditorInstance
}>()

const textEditor = editor || inject<TextEditorInstance>('textEditor')!
const { $gettext } = useGettext()
const dropRef = useTemplateRef<ComponentPublicInstance<typeof OcDrop>>('dropRef')
const actionRowRef = useTemplateRef<HTMLElement>('actionRowRef')
const urlInputRef = useTemplateRef<ComponentPublicInstance<typeof OcTextInput>>('urlInputRef')
const urlInputId = useId()
const textInputId = useId()
const url = ref('')
const text = ref('')
let skipApplyOnHide = false

const panelRequest = computed(() => unref(textEditor.state.linkPanel))
const isActionView = computed(() => unref(panelRequest)?.view === 'actions')
const normalizedUrl = computed(() => normalizeLinkUrl(unref(url)))
const actionUrl = computed(() => normalizeLinkUrl(unref(panelRequest)?.href || ''))

function getAnchorElement(): VirtualElement | undefined {
  const tiptapEditor = unref(textEditor.editor)
  const request = unref(panelRequest)
  if (!tiptapEditor || !request) {
    return undefined
  }

  const start = tiptapEditor.view.coordsAtPos(request.range.from)
  const end = tiptapEditor.view.coordsAtPos(request.range.to)
  const left = Math.min(start.left, end.left)
  const right = Math.max(start.right, end.right, left + 1)
  const top = Math.min(start.top, end.top)
  const bottom = Math.max(start.bottom, end.bottom)

  return {
    getBoundingClientRect: () =>
      ({
        x: left,
        y: top,
        left,
        right,
        top,
        bottom,
        width: right - left,
        height: bottom - top,
        toJSON: () => ({})
      }) as DOMRect
  }
}

function applyChanges(): boolean {
  const tiptapEditor = unref(textEditor.editor)
  const request = unref(panelRequest)
  const href = unref(normalizedUrl)
  if (!tiptapEditor || !request || !href) {
    return false
  }

  const displayText = unref(text) || href
  const contentChanged = request.range.from === request.range.to || displayText !== request.text
  const updatedRange = contentChanged
    ? {
        from: request.range.from,
        to: request.range.from + displayText.length
      }
    : request.range
  const chain = tiptapEditor.chain().focus().setTextSelection(request.range)

  if (contentChanged) {
    // Insert as an explicit text node so the display text is never parsed as HTML.
    chain.insertContent({ type: 'text', text: displayText })
  }

  chain.setTextSelection(updatedRange).setLink({ href }).setTextSelection(updatedRange.to).run()

  request.range = updatedRange
  request.href = href
  request.text = displayText
  url.value = href
  text.value = displayText
  dropRef.value?.update({ anchorElement: getAnchorElement() })
  return true
}

async function closePanel(apply: boolean): Promise<void> {
  if (apply && !applyChanges()) {
    urlInputRef.value?.focus()
    return
  }

  skipApplyOnHide = true
  dropRef.value?.hide()
  textEditor.state.linkPanel.value = null
  await nextTick()
  unref(textEditor.editor)?.commands.focus()
}

async function editLink(): Promise<void> {
  const request = unref(panelRequest)
  if (!request) {
    return
  }

  request.view = 'edit'
  await nextTick()
  await dropRef.value?.update({ anchorElement: getAnchorElement() })
  urlInputRef.value?.focus()
}

function onEnter(event: KeyboardEvent): void {
  if (event.target instanceof HTMLInputElement) {
    event.preventDefault()
    closePanel(true)
  }
}

function onDropHide(): void {
  if (!skipApplyOnHide) {
    if (!unref(isActionView)) {
      applyChanges()
    }
    textEditor.state.linkPanel.value = null
  }
  skipApplyOnHide = false
}

function openLink(): void {
  const href = unref(actionUrl)
  if (!href) {
    return
  }
  window.open(href, '_blank', 'noopener,noreferrer')
}

async function removeLink(): Promise<void> {
  const tiptapEditor = unref(textEditor.editor)
  const request = unref(panelRequest)
  if (!tiptapEditor || !request) {
    return
  }

  tiptapEditor
    .chain()
    .focus()
    .setTextSelection(request.range)
    .extendMarkRange('link')
    .unsetLink()
    .setTextSelection(request.range.to)
    .run()
  await closePanel(false)
}

watch(
  panelRequest,
  async (request) => {
    if (!request) {
      dropRef.value?.hide()
      return
    }

    url.value = request.href
    text.value = request.text
    await nextTick()
    await dropRef.value?.show({ anchorElement: getAnchorElement(), noFocus: true })
    await nextTick()
    if (request.view === 'actions') {
      unref(actionRowRef)?.focus({ preventScroll: true })
      return
    }
    urlInputRef.value?.focus()
  },
  { flush: 'post' }
)
</script>
