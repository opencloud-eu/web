const emailPattern =
  /^[-!#$%&'*+/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/

// length limits from RFC 5321
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254 || !emailPattern.test(email)) {
    return false
  }

  const [localPart, domain] = email.split('@')
  if (localPart.length > 64) {
    return false
  }
  return domain.split('.').every((label) => label.length <= 63)
}
