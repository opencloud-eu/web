export function isEditableElement(element: Element): boolean {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true
  }

  if (element instanceof HTMLElement) {
    return element.isContentEditable
  }

  return false
}
