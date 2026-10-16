/** Normalize a shortcut target and allow only HTTP(S) navigation. */
export function getShortcutUrl(input: string): string | undefined {
  const value = input.trim()
  // Add HTTPS to bare hostnames, including host:port.
  const url = /^[a-z][a-z\d+.-]*:(?!\d)/i.test(value) ? value : `https://${value}`

  try {
    const parsedUrl = new URL(url)
    // Only HTTP(S) navigation is allowed, so javascript: and data: cannot execute.
    // Serialization encodes special characters and prevents extra lines in the .url file.
    return ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.href : undefined
  } catch {
    return
  }
}
