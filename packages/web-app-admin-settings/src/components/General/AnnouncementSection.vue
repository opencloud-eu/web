<template>
  <div class="max-w-2xl">
    <div class="flex items-center justify-between gap-4 mb-1">
      <h2 class="text-lg font-semibold" v-text="$gettext('Announcement banner')" />
      <oc-switch
        :checked="enabled"
        :label="$gettext('Enabled')"
        class="inline-flex"
        :class="{ 'pointer-events-none opacity-60': isBusy }"
        @update:checked="onToggleEnabled"
      />
    </div>
    <p class="text-role-on-surface-variant mb-3">
      {{
        $gettext(
          'Shown above the top bar for all users, including on the login page before sign-in. Do not include sensitive information.'
        )
      }}
      <br />
      {{
        $gettext(
          'The banner text is shown in the bar. The info text is shown in a dialog when users click the banner. It is only public while enabled.'
        )
      }}
    </p>
    <oc-text-input v-model="bannerText" :label="$gettext('Banner text')" class="mb-3" />
    <span class="inline-block mb-0.5" v-text="$gettext('Info text')" />
    <div class="border border-role-outline-variant rounded-lg overflow-hidden">
      <text-editor-provider :editor="infoEditor">
        <text-editor-toolbar />
        <text-editor-content class="min-h-[32rem] max-h-[48rem] px-3 py-2 overflow-auto" />
      </text-editor-provider>
    </div>
    <div class="flex items-center justify-between gap-2 mt-3">
      <oc-button appearance="outline" :disabled="!canPreview || isBusy" @click="preview">
        {{ $gettext('Preview') }}
      </oc-button>
      <oc-button
        appearance="filled"
        :disabled="!isDirty || isBusy"
        :show-spinner="saveTask.isRunning"
        @click="saveTask.perform()"
      >
        {{ $gettext('Save') }}
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRef, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import { HttpError } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore, useMessages } from '@opencloud-eu/web-pkg'
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar
} from '@opencloud-eu/web-pkg/editor'
import { useGettext } from 'vue3-gettext'

type StoredAnnouncement = { enabled: boolean; bannerText: string; infoText: string }

const { $gettext } = useGettext()
const configStore = useConfigStore()
const clientService = useClientService()
const { showMessage, showErrorMessage } = useMessages()

const enabled = ref(false)
const bannerText = ref('')
const infoText = ref('')
const stored = ref<StoredAnnouncement>({ enabled: false, bannerText: '', infoText: '' })

const infoEditor = useTextEditor({
  contentType: 'markdown',
  modelValue: toRef(() => unref(infoText)),
  ariaLabel: $gettext('Info text'),
  // no image insertion via the UI: base64 uploads would bloat the public config.json,
  // and anyone who really needs an image can add safe Markdown by hand
  excludeActions: ['image', 'image-upload', 'image-url'],
  onUpdate: (content) => {
    infoText.value = content
  }
})

// only the text fields make the form dirty; the enabled switch persists on its own
const isDirty = computed(
  () =>
    unref(bannerText).trim() !== stored.value.bannerText ||
    unref(infoText).trim() !== stored.value.infoText
)
const canPreview = computed(() => !!unref(bannerText).trim())

// update the live banner in the running session (shown only while enabled and a banner text is set)
function reflectLiveBanner(a: StoredAnnouncement) {
  configStore.options.announcement =
    a.enabled && a.bannerText ? { bannerText: a.bannerText, infoText: a.infoText } : undefined
}

// apply a persisted state to the form, the stored snapshot and the live banner
function apply(a: StoredAnnouncement) {
  enabled.value = a.enabled
  bannerText.value = a.bannerText
  infoText.value = a.infoText
  // push into the editor explicitly: the modelValue watch is skipped while the editor is
  // focused (it auto-focuses on mount), so async-loaded content would otherwise not show
  infoEditor.setContent(a.infoText)
  stored.value = { ...a }
  reflectLiveBanner(a)
}

function showWriteError(e: unknown, title: string) {
  console.error(e)
  showErrorMessage({ title, errors: [e as HttpError] })
}

const loadTask = useTask(function* () {
  try {
    const { data } = yield clientService.httpAuthenticated.get<StoredAnnouncement>('announcement')
    apply({
      enabled: !!data?.enabled,
      bannerText: data?.bannerText ?? '',
      infoText: data?.infoText ?? ''
    })
  } catch (e) {
    showWriteError(e, $gettext('Failed to load the announcement banner'))
  }
}).drop()

// Save persists the text fields, keeping the current enabled state. An empty banner text
// removes the announcement entirely. It does not change the enabled state.
const saveTask = useTask(function* () {
  const bannerTextValue = unref(bannerText).trim()
  // an empty banner text removes the announcement entirely (the backend deletes the record)
  const payload: StoredAnnouncement = bannerTextValue
    ? { enabled: unref(enabled), bannerText: bannerTextValue, infoText: unref(infoText).trim() }
    : { enabled: false, bannerText: '', infoText: '' }
  try {
    yield clientService.httpAuthenticated.put('announcement', payload)
    apply(payload)
    showMessage({
      title: bannerTextValue
        ? $gettext('Announcement banner updated')
        : $gettext('Announcement banner removed')
    })
  } catch (e) {
    showWriteError(e, $gettext('Failed to update the announcement banner'))
  }
}).drop()

// The switch persists on its own and only flips the enabled state on the saved announcement.
// Text edits are not published by toggling, use Save for that.
const toggleTask = useTask(function* () {
  const value = unref(enabled)
  const payload: StoredAnnouncement = {
    enabled: value,
    bannerText: stored.value.bannerText,
    infoText: stored.value.infoText
  }
  try {
    yield clientService.httpAuthenticated.put('announcement', payload)
    stored.value = { ...payload }
    reflectLiveBanner(payload)
    showMessage({
      title: value
        ? $gettext('Announcement banner enabled')
        : $gettext('Announcement banner disabled')
    })
  } catch (e) {
    enabled.value = !value
    showWriteError(e, $gettext('Failed to update the announcement banner'))
  }
}).drop()

function onToggleEnabled(value: boolean) {
  // there is nothing to enable until a banner text has been saved
  if (value && !stored.value.bannerText) {
    showMessage({ title: $gettext('Add a banner text and save it first') })
    return
  }
  enabled.value = value
  toggleTask.perform()
}

// show the current form in this session only, without persisting or enabling it,
// so the banner and dialog can be tested before going live
function preview() {
  configStore.options.announcement = {
    bannerText: unref(bannerText).trim(),
    infoText: unref(infoText).trim()
  }
  showMessage({ title: $gettext('Previewing in this session only, not saved') })
}

const isBusy = computed(() => loadTask.isRunning || saveTask.isRunning || toggleTask.isRunning)

onMounted(() => {
  loadTask.perform()
})
</script>
