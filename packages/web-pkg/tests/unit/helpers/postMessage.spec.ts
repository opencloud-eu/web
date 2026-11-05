import { isMessageFromIframe } from '../../../src/helpers/postMessage'

function createMessageEvent({ source, origin }: { source: unknown; origin: string }) {
  const event = new MessageEvent('message', { origin })
  Object.defineProperty(event, 'source', { value: source })
  return event
}

describe('isMessageFromIframe', () => {
  const contentWindow = {}
  const iframe = { contentWindow } as unknown as HTMLIFrameElement

  it('returns true if source and origin match', () => {
    const event = createMessageEvent({ source: contentWindow, origin: 'https://cloud.example' })
    expect(isMessageFromIframe(event, iframe, 'https://cloud.example')).toBe(true)
  })
  it('returns true if source matches and no origin is expected', () => {
    const event = createMessageEvent({ source: contentWindow, origin: 'https://other.example' })
    expect(isMessageFromIframe(event, iframe)).toBe(true)
  })
  it('returns false if the source is a different window', () => {
    const event = createMessageEvent({ source: {}, origin: 'https://cloud.example' })
    expect(isMessageFromIframe(event, iframe, 'https://cloud.example')).toBe(false)
  })
  it('returns false if the origin does not match', () => {
    const event = createMessageEvent({ source: contentWindow, origin: 'https://attacker.example' })
    expect(isMessageFromIframe(event, iframe, 'https://cloud.example')).toBe(false)
  })
  it.each([null, undefined, { contentWindow: null } as unknown as HTMLIFrameElement])(
    'returns false if the iframe is not available',
    (unavailableIframe) => {
      const event = createMessageEvent({ source: null, origin: 'https://cloud.example' })
      expect(isMessageFromIframe(event, unavailableIframe)).toBe(false)
    }
  )
})
