import { pbkdf2 } from '@noble/hashes/pbkdf2.js'
import { sha512 } from '@noble/hashes/sha2.js'
import { randomBytes } from '@noble/hashes/utils.js'

export const pbkdf2Sync = (password, salt, c, dkLen) => {
  return Buffer.from(pbkdf2(sha512, password, salt, { c, dkLen }))
}

export const randomFillSync = (buffer) => {
  const randomValues = randomBytes(buffer.length)
  buffer.set(randomValues)
  return buffer
}

export default { randomFillSync }
