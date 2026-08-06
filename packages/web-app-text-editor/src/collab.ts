import { ref, unref } from 'vue'
import type { Resource } from '@opencloud-eu/web-client'
import type { CollaborativeAdapter, CollaborativeAdapterContext } from '@opencloud-eu/web-pkg'
import {
  makeTiptapCollabAdapter,
  useContentStrategy,
  type ContentType,
  type ContentTypeStrategy,
  type TextEditorLinkPanelRequest,
  type TextEditorState
} from '@opencloud-eu/web-pkg/editor'

/** The content types this app can produce. A subset of {@link ContentType}. */
export type TextEditorContentType = Extract<ContentType, 'markdown' | 'plain-text'>

export function detectContentType(resource: Resource): TextEditorContentType {
  const extension = resource?.extension?.toLowerCase()
  const mimeType = resource?.mimeType?.toLowerCase()
  if (extension === 'md' || extension === 'markdown' || mimeType === 'text/markdown') {
    return 'markdown'
  }

  return 'plain-text'
}

/**
 * Builds the Y.Doc bridge the AppWrapper's collaborative session runs on.
 *
 * Called during the wrapper's setup, before the file is loaded — so the
 * content type is resolved lazily, per call, from the resource ref. The
 * strategies themselves must be built eagerly: they call `useGettext()`, which
 * only works while a setup context is active.
 */
export function makeTextEditorAdapter({
  resource
}: CollaborativeAdapterContext): CollaborativeAdapter {
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
    markdown: resolveStrategy('markdown', state)
  }

  return makeTiptapCollabAdapter(() => strategies[detectContentType(unref(resource))])
}
