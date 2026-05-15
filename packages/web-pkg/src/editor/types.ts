import type { ShallowRef, Ref, ComputedRef } from 'vue'
import { Editor } from '@tiptap/vue-3'
import { EditorActionGroup } from './composables'

export type ContentType = 'plain-text' | 'markdown' | 'html' | 'tiptap-json'

export interface TextEditorCollaborationUser {
  id: string
  name: string
  color: string
}

export interface TextEditorCollaborationOptions {
  wsUrl: string
  room: string
  // Token getter — Hocuspocus calls this on every (re)connect attempt. The
  // OpenCloud web client maintains a current OIDC access token in its auth
  // store via a refresh worker, so a synchronous read of that store is the
  // canonical source; we don't need our own waiting/refresh logic.
  token: () => string
  user: TextEditorCollaborationUser
  // Optional handler for server-broadcasted stateless messages. The server
  // uses this to inform connected clients about out-of-band events such as
  // external file overwrites. Payload is whatever the server sends (a JSON
  // string in our wire format).
  onStateless?: (payload: string) => void
}

export interface TextEditorOptions {
  contentType: ContentType
  modelValue?: Ref<string>
  readonly?: boolean
  slashCommands?: boolean
  placeholder?: string
  onUpdate?: (content: string) => void
  onRequestLinkUrl?: (currentUrl?: string) => Promise<string | null>
  onRequestImageUrl?: () => Promise<string | null>
  collaboration?: TextEditorCollaborationOptions
}

export interface TextEditorState {
  sourceMode: Ref<boolean>
}

export interface TextEditorInstance {
  state: TextEditorState
  editor: ShallowRef<Editor | null>
  contentType: Ref<ContentType>
  readonly: Ref<boolean>
  actionGroups(): EditorActionGroup[]
  getContent(): string
  isEmpty: ComputedRef<boolean>
  isFocused: ComputedRef<boolean>
  focus(): void
  blur(): void
  destroy(): void
}
