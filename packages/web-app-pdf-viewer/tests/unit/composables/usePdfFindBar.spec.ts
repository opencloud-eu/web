import { mock } from 'vitest-mock-extended'
// pdf_viewer.mjs takes PDF.js from globalThis.pdfjsLib, which pdfjs-dist sets when imported.
import 'pdfjs-dist'
import { FindState, type EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfFindBar } from '../../../src/composables/usePdfFindBar'

const OPTIONS = {
  highlightAll: false,
  caseSensitive: false,
  entireWord: false,
  matchDiacritics: false
}

function setup() {
  const eventBus = mock<EventBus>()
  const findBar = { $el: document.createElement('div'), focus: vi.fn() }
  const input = document.createElement('input')
  findBar.$el.append(input)
  document.body.append(findBar.$el)
  const onClose = vi.fn()
  let findBarState: ReturnType<typeof usePdfFindBar>
  getComposableWrapper(() => {
    findBarState = usePdfFindBar({ eventBus, findBar, onClose })
  })
  function emit(name: string, event: object = {}) {
    eventBus.on.mock.calls
      .filter(([eventName]) => eventName === name)
      .forEach(([, listener]) => listener(event))
  }
  function findEvents() {
    return eventBus.dispatch.mock.calls.filter(([name]) => name === 'find')
  }
  return { findBarState, findBar, input, eventBus, emit, findEvents, onClose }
}

describe('usePdfFindBar', () => {
  it('searches with PDF.js and shows its result', () => {
    const { findBarState, emit, findEvents } = setup()
    findBarState.openFindBar()
    findBarState.findQuery.value = 'foo'
    findBarState.findOptions.value = { ...OPTIONS, caseSensitive: true }
    findBarState.find({ type: 'again', findPrevious: true })
    expect(findEvents()[0][1]).toEqual({
      source: null,
      type: 'again',
      query: 'foo',
      findPrevious: true,
      ...OPTIONS,
      caseSensitive: true
    })
    emit('updatefindcontrolstate', {
      state: FindState.NOT_FOUND,
      matchesCount: { current: 0, total: 0 }
    })
    expect(findBarState.findResult.value).toEqual({ current: 0, total: 0, notFound: true })
    emit('updatefindmatchescount', { matchesCount: { current: 2, total: 7 } })
    expect(findBarState.findResult.value).toEqual({ current: 2, total: 7, notFound: true })
  })

  // E.g. after a page operation.
  it('searches again in a changed document', () => {
    const { findBarState, emit, findEvents } = setup()
    findBarState.openFindBar()
    findBarState.findQuery.value = 'foo'
    findBarState.find()
    emit('updatefindmatchescount', { matchesCount: { current: 2, total: 7 } })
    emit('pagesdestroy')
    expect(findBarState.findResult.value.total).toBe(0)
    emit('pagesinit')
    expect(findEvents()).toHaveLength(2)
    expect(findEvents()[1][1]).toEqual(expect.objectContaining({ query: 'foo', type: '' }))
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('ends the search when closed', () => {
    const { findBarState, input, eventBus, emit, findEvents, onClose } = setup()
    findBarState.openFindBar()
    findBarState.findQuery.value = 'foo'
    findBarState.find()
    input.focus()
    findBarState.closeFindBar(true)
    expect(findBarState.isFindBarOpen.value).toBe(false)
    // With Escape, the focus goes back to the pages.
    expect(onClose).toHaveBeenCalledWith(true)
    expect(eventBus.dispatch).toHaveBeenCalledWith('findbarclose', { source: null })
    emit('pagesinit')
    expect(findEvents()).toHaveLength(1)
  })

  // E.g. Escape in the pages keeps the focus there, like in the PDF.js viewer.
  it('keeps a search without matches as such while closed, for reopening', () => {
    const { findBarState, emit } = setup()
    findBarState.openFindBar()
    findBarState.findQuery.value = 'xyz'
    findBarState.find()
    emit('updatefindcontrolstate', {
      state: FindState.NOT_FOUND,
      matchesCount: { current: 0, total: 0 }
    })
    findBarState.closeFindBar()
    // What PDF.js reports for the closed find bar.
    emit('updatefindcontrolstate', {
      state: FindState.FOUND,
      matchesCount: { current: 0, total: 0 }
    })
    expect(findBarState.findResult.value.notFound).toBe(true)
    // Finding again while closed (Ctrl+G) still reports the new match.
    emit('updatefindcontrolstate', {
      state: FindState.FOUND,
      matchesCount: { current: 2, total: 7 }
    })
    expect(findBarState.findResult.value).toEqual({ current: 2, total: 7, notFound: false })
  })

  it('leaves the focus alone when closed from outside the find bar', () => {
    const { findBarState, onClose } = setup()
    findBarState.openFindBar()
    findBarState.closeFindBar()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('finds again with the kept search also while closed, like the PDF.js viewer', () => {
    const { findBarState, findEvents, emit } = setup()
    findBarState.findAgain(false)
    expect(findEvents()).toHaveLength(0)
    findBarState.findQuery.value = 'foo'
    findBarState.findAgain(true)
    expect(findEvents()[0][1]).toEqual({
      source: null,
      type: 'again',
      query: 'foo',
      findPrevious: true,
      ...OPTIONS
    })
    // Not again for the next document, the find bar is closed.
    emit('pagesinit')
    expect(findEvents()).toHaveLength(1)
  })

  it('focuses the open find bar instead of opening it again', () => {
    const { findBarState, findBar } = setup()
    findBarState.openFindBar()
    expect(findBarState.isFindBarOpen.value).toBe(true)
    findBarState.openFindBar()
    expect(findBar.focus).toHaveBeenCalled()
  })

  it('opens with the search buttons of forms', () => {
    const { findBarState, emit } = setup()
    emit('namedaction', { action: 'Find' })
    expect(findBarState.isFindBarOpen.value).toBe(true)
  })
})
