import { reactive, ref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfHandTool } from '../../../src/composables/usePdfHandTool'

function setup({ isToolActive = false } = {}) {
  const container = document.createElement('div')
  const link = document.createElement('a')
  link.href = '#'
  container.append(link)
  document.body.append(container)
  container.scrollTo = vi.fn()
  const state = reactive({ isToolActive, isPresenting: false })
  const leaveTool = vi.fn(() => {
    state.isToolActive = false
  })
  let tool: ReturnType<typeof usePdfHandTool>
  const wrapper = getComposableWrapper(() => {
    tool = usePdfHandTool({
      container: ref(container),
      isToolActive: () => state.isToolActive,
      isPresenting: () => state.isPresenting,
      leaveTool
    })
  })
  return { tool, container, link, leaveTool, state, wrapper }
}

function mouse(target: EventTarget, type: string, init: MouseEventInit) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

describe('usePdfHandTool', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('moves the pages by dragging, without selecting text', () => {
    const { tool, container } = setup()
    tool.setChosen(true)
    const down = mouse(container, 'mousedown', { button: 0, clientX: 100, clientY: 100 })
    mouse(document, 'mousemove', { buttons: 1, clientX: 70, clientY: 40 })
    mouse(document, 'mouseup', {})
    expect(down.defaultPrevented).toBe(true)
    expect(container.scrollTo).toHaveBeenCalledWith({ left: 30, top: 60, behavior: 'instant' })
  })

  it('leaves links clickable', () => {
    const { tool, link, container } = setup()
    tool.setChosen(true)
    const down = mouse(link, 'mousedown', { button: 0, clientX: 0, clientY: 0 })
    mouse(document, 'mousemove', { buttons: 1, clientX: 10, clientY: 10 })
    expect(down.defaultPrevented).toBe(false)
    expect(container.scrollTo).not.toHaveBeenCalled()
  })

  it('pauses while an annotation tool is active or the pages are presented', () => {
    const { tool, state } = setup()
    tool.setChosen(true)
    expect(tool.isActive.value).toBe(true)
    state.isToolActive = true
    expect(tool.isActive.value).toBe(false)
    state.isToolActive = false
    state.isPresenting = true
    expect(tool.isActive.value).toBe(false)
    state.isPresenting = false
    expect(tool.isActive.value).toBe(true)
  })

  it('leaves an active annotation tool when chosen', () => {
    const { tool, leaveTool } = setup({ isToolActive: true })
    tool.setChosen(true)
    expect(leaveTool).toHaveBeenCalled()
    expect(tool.isActive.value).toBe(true)
  })

  it('does nothing when not chosen', () => {
    const { container } = setup()
    const down = mouse(container, 'mousedown', { button: 0, clientX: 0, clientY: 0 })
    expect(down.defaultPrevented).toBe(false)
  })
})
