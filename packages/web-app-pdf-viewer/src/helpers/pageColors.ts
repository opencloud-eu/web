/**
 * The colors of a high contrast mode (forced colors, e.g. a contrast theme of Windows) for
 * rendering the pages and their thumbnails, like in the PDF.js viewer. Null without one.
 */
export function getPageColors() {
  return window.matchMedia('(forced-colors: active)').matches
    ? { background: 'Canvas', foreground: 'CanvasText' }
    : null
}
