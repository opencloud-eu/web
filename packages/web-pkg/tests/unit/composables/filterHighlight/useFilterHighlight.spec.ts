import { nextTick, ref } from 'vue'
import { useFilterHighlight } from '../../../../src/composables'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'

describe('useFilterHighlight', () => {
  it('highlights the occurrences of the term', async () => {
    const { element, term } = getWrapper()

    term.value = 'curie'
    await nextTick()

    const highlights = element.value.querySelectorAll('span.mark-highlight')
    expect(highlights.length).toBe(1)
    expect(highlights[0].textContent).toBe('Curie')
  })

  it('removes the highlights of the previous term', async () => {
    const { element, term } = getWrapper()

    term.value = 'curie'
    await nextTick()
    term.value = 'albert'
    await nextTick()

    const highlights = element.value.querySelectorAll('span.mark-highlight')
    expect(highlights.length).toBe(1)
    expect(highlights[0].textContent).toBe('Albert')
  })

  it('keeps the text intact when the term changes repeatedly', async () => {
    const { element, term } = getWrapper()

    term.value = 'marie'
    await nextTick()
    term.value = 'mar'
    await nextTick()
    term.value = 'marie'
    await nextTick()

    expect(element.value.textContent).toBe('Albert EinsteinMarie Curie')
    expect(element.value.querySelectorAll('span.mark-highlight').length).toBe(1)
  })

  it('keeps empty text nodes, as vue uses them as fragment anchors', async () => {
    const { element, term } = getWrapper()
    const anchor = document.createTextNode('')
    element.value.appendChild(anchor)

    term.value = 'curie'
    await nextTick()
    term.value = 'albert'
    await nextTick()

    expect(anchor.parentNode).toBe(element.value)
  })

  it('re-applies the highlights if the rendered items change', async () => {
    const { element, term, items } = getWrapper()

    term.value = 'curie'
    await nextTick()

    element.value.innerHTML = '<div>Marie Curie</div>'
    items.value = ['Marie Curie']
    await nextTick()

    expect(element.value.querySelectorAll('span.mark-highlight').length).toBe(1)
  })
})

function getWrapper() {
  const element = ref<HTMLElement>(document.createElement('div'))
  element.value.innerHTML = '<div>Albert Einstein</div><div>Marie Curie</div>'
  const term = ref('')
  const items = ref<unknown[]>([])

  getComposableWrapper(() => {
    useFilterHighlight({ element, term, items })
  })

  return { element, term, items }
}
