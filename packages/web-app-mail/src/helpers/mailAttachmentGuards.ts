import type { MailBodyPart } from '../types'
import type { MailComposeAttachment } from '../components/MailComposeForm.vue'

export type Attachment = MailBodyPart | MailComposeAttachment

export type AttachmentWithBlobId = Attachment & { blobId: string }
export type AttachmentWithId = Attachment & { id: string }

export const hasBlobId = (a: Attachment): a is AttachmentWithBlobId => {
  const blobId = (a as AttachmentWithBlobId).blobId
  return typeof blobId === 'string' && blobId.length > 0
}

export const hasId = (a: Attachment): a is AttachmentWithId => {
  const id = (a as AttachmentWithId).id
  return typeof id === 'string' && id.length > 0
}
