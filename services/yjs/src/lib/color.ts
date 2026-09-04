export function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  function channel(n: number): string {
    const k = (n + h / 30) % 12
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

/**
 * Hex, not hsl(): @tiptap/extension-collaboration-caret rejects any other
 * format and warns on every awareness update.
 */
export function deterministicColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  return hslToHex(Math.abs(hash) % 360, 0.7, 0.5)
}
