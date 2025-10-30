export const accentuateItem = (id: string, clearTimeout = 3500): void => {
  const item = document.querySelectorAll(`[data-item-id='${id}']`)[0]

  if (!item) {
    return
  }

  item.classList.add('item-accentuated')
  setTimeout(() => {
    item.classList.remove('item-accentuated')
  }, clearTimeout)
}
