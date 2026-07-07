import { isComposingEvent } from './isComposingEvent'

describe('isComposingEvent', () => {
  it('returns true when the event is part of an IME composition session', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', isComposing: true })
    expect(isComposingEvent(event)).toBe(true)
  })

  it('returns true when the event has keyCode 229', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229 } as KeyboardEventInit)
    expect(isComposingEvent(event)).toBe(true)
  })

  it('returns false for a regular keyboard event', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    expect(isComposingEvent(event)).toBe(false)
  })
})
