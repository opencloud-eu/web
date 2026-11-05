import { isMessageFromIframe, isMessageFromParent } from '../../../src/helpers/postMessage'

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

describe('isMessageFromParent', () => {
  const parentWindow = {} as Window

  beforeEach(() => {
    vi.spyOn(window, 'parent', 'get').mockReturnValue(parentWindow)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true if source is the parent window and origin matches', () => {
    const event = createMessageEvent({ source: parentWindow, origin: 'https://host.example' })
    expect(isMessageFromParent(event, 'https://host.example')).toBe(true)
  })
  it('returns true if source is the parent window and no origin is expected', () => {
    const event = createMessageEvent({ source: parentWindow, origin: 'https://host.example' })
    expect(isMessageFromParent(event)).toBe(true)
  })
  it.each([{}, null])('returns false if the source is not the parent window', (source) => {
    const event = createMessageEvent({ source, origin: 'https://host.example' })
    expect(isMessageFromParent(event, 'https://host.example')).toBe(false)
  })
  it('returns false if the origin does not match', () => {
    const event = createMessageEvent({ source: parentWindow, origin: 'https://attacker.example' })
    expect(isMessageFromParent(event, 'https://host.example')).toBe(false)
  })
  it('returns false if the app is not embedded', () => {
    vi.restoreAllMocks()
    const event = createMessageEvent({ source: window, origin: window.location.origin })
    expect(isMessageFromParent(event)).toBe(false)
  })
})
