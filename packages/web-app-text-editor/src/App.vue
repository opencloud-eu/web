<template>
  <TextEditor
    :key="rebuildKey"
    :current-content="currentContent"
    :parsed-content-type="parsedContentType"
    :is-read-only="isReadOnly"
    :collaboration="collaboration"
    @update:current-content="(value) => emit('update:currentContent', value)"
  />
</template>

<script setup lang="ts">
import { computed, toRef, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { computed, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useAuthStore, useConfigStore, useMessages, useUserStore } from '@opencloud-eu/web-pkg'
import {
  ContentType,
  TextEditorCollaborationOptions,
  hslColorFromString
} from '@opencloud-eu/web-pkg/editor'
import type { Resource } from '@opencloud-eu/web-client'
import TextEditor from './TextEditor.vue'

const {
  currentContent,
  contentType = undefined,
  isReadOnly = false,
  resource
} = defineProps<{
  currentContent: string
  contentType?: ContentType
  isReadOnly?: boolean
  resource: Resource
}>()

const emit = defineEmits<{
  (e: 'update:currentContent', value: string): void
}>()

const authStore = useAuthStore()
const configStore = useConfigStore()
const userStore = useUserStore()
const messagesStore = useMessages()
const { $gettext } = useGettext()

function handleStateless(payload: string): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    return
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    (parsed as { type?: unknown }).type === 'externalOverwrite'
  ) {
    messagesStore.showMessage({
      title: $gettext('External change detected'),
      desc: $gettext(
        'Another process modified this file. Your session overwrote those changes — the previous content is preserved in the file’s version history.'
      ),
      status: 'warning',
      timeout: 0
    })
  }
}

const { $gettext } = useGettext()

const parsedContentType = computed<ContentType>(() => {
  if (contentType !== undefined) {
    return contentType
  }
  const ext = resource?.extension?.toLowerCase()
  const mimeType = resource?.mimeType?.toLowerCase()
  if (ext === 'md' || ext === 'markdown' || mimeType === 'text/markdown') {
    return 'markdown'
  }
  if (ext === 'html' || ext === 'htm' || mimeType === 'text/html') {
    return 'html'
  }
  if (ext === 'json' || mimeType === 'application/json') {
    return 'tiptap-json'
  }
  return 'plain-text'
})

const placeholder = computed(() => {
  if (isReadOnly || unref(parsedContentType) !== 'markdown') {
    return undefined
  }
  return $gettext('Write or type / for formatting options...')
})

const textEditor = useTextEditor({
  contentType: unref(parsedContentType),
  modelValue: toRef(() => currentContent),
  readonly: isReadOnly,
  placeholder: unref(placeholder),
  onUpdate: (content) => emit('update:currentContent', content)
const collaborationWsUrl = computed(() => {
  const fromConfig = configStore.options.editor?.collaboration?.wsUrl
  if (fromConfig) {
    return fromConfig
  }
  // Dev fallback: OpenCloud's server-side options allowlist currently strips
  // unknown keys, so the config-driven path doesn't reach the client. Derive
  // the WSS endpoint from the current origin assuming the hocuspocus service
  // is reachable on port 9400 of the same host.
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `wss://${window.location.hostname}:9400`
  }
  return null
})

// Latches once we've ever seen a non-empty access token. Used as a sticky gate
// for `canCollaborate` so transient null windows during OIDC silent renewal
// don't bounce the editor in and out of collaboration mode (which would
// destroy the Y.Doc binding and the user's cursor every ~hour).
const initialTokenSeen = ref(!!authStore.accessToken)
watch(
  () => authStore.accessToken,
  (value) => {
    if (value) {
      initialTokenSeen.value = true
    }
  },
  { immediate: true }
)

const canCollaborate = computed(() => {
  if (isReadOnly) {
    return false
  }
  if (!unref(collaborationWsUrl)) {
    return false
  }
  const ct = unref(parsedContentType)
  if (ct !== 'markdown' && ct !== 'plain-text') {
    return false
  }
  if (!resource?.fileId) {
    return false
  }
  if (!userStore.user?.id) {
    return false
  }
  // Sticky gate — we never start a provider without ever having seen a token,
  // but we also don't react to subsequent transient drops (waitForToken
  // handles those).
  if (!initialTokenSeen.value) {
    return false
  }
  return true
})

const collaboration = computed<TextEditorCollaborationOptions | undefined>(() => {
  if (!unref(canCollaborate)) {
    return undefined
  }
  const wsUrl = unref(collaborationWsUrl) as string
  const ctHint = unref(parsedContentType) === 'markdown' ? 'md' : 'txt'
  // Room name: "<fileId>__<ct>". `__` because OpenCloud's fileId already uses
  // `$` and `!` as internal separators.
  const room = `${resource.fileId}__${ctHint}`
  const user = {
    id: userStore.user!.id!,
    name: userStore.user!.displayName ?? userStore.user!.id!,
    color: hslColorFromString(userStore.user!.id!)
  }
  return {
    wsUrl,
    room,
    // Hocuspocus calls this on every (re)connect; the web client's auth
    // worker keeps `authStore.accessToken` current, so a plain read is the
    // right source. If we ever get an empty token (logout, hard renewal
    // failure), `onAuthenticationFailed` engages the single-user autosave
    // fallback in useTextEditor.
    token: () => authStore.accessToken ?? '',
    user,
    onStateless: handleStateless
  }
})

// Remount only when `canCollaborate` flips (e.g., we transition from no-token
// to having-token on first sign-in). Token rotations are absorbed by the
// active provider's open WebSocket plus the async token getter on reconnect.
const rebuildKey = ref(0)
watch(canCollaborate, () => {
  rebuildKey.value++
})
</script>
