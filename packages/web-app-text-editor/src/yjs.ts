import { ref, unref } from 'vue'
import type { Resource } from '@opencloud-eu/web-client'
import type { YjsAdapter, YjsAdapterContext } from '@opencloud-eu/web-pkg'
import {
  makeTiptapYjsAdapter,
  useContentStrategy,
  type ContentType,
  type ContentTypeStrategy,
  type TextEditorLinkPanelRequest,
  type TextEditorState
} from '@opencloud-eu/web-pkg/editor'

/** The content types this app can produce. A subset of {@link ContentType}. */
export type TextEditorContentType = Extract<ContentType, 'markdown' | 'plain-text' | 'tiptap-json'>

export function detectContentType(resource: Resource): TextEditorContentType {
  const extension = resource?.extension?.toLowerCase()
  const mimeType = resource?.mimeType?.toLowerCase()
  if (extension === 'ocnote') {
    return 'tiptap-json'
  }

  if (extension === 'md' || extension === 'markdown' || mimeType === 'text/markdown') {
    return 'markdown'
  }

  return 'plain-text'
}

/**
 * Builds the Y.Doc bridge the AppWrapper's Yjs session runs on.
 */
export function makeTextEditorAdapter({ resource }: YjsAdapterContext): YjsAdapter {
  const { resolveStrategy } = useContentStrategy()

  // The adapter needs its own editor state for the headless fallback path; the
  // mounted editor resolves its own inside `useTextEditor`.
  const state: TextEditorState = {
    sourceMode: ref(false),
    linkPanel: ref<TextEditorLinkPanelRequest | null>(null),
    editorZoom: ref(100),
    currentResource: resource
  }

  const strategies: Record<TextEditorContentType, ContentTypeStrategy> = {
    'plain-text': resolveStrategy('plain-text', state),
    markdown: resolveStrategy('markdown', state),
    'tiptap-json': resolveStrategy('tiptap-json', state)
  }

  return makeTiptapYjsAdapter(() => strategies[detectContentType(unref(resource))])
}
