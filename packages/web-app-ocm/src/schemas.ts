import { z } from 'zod'

// Invite
export const inviteSchema = z.object({
  token: z.string(),
  expiration: z.number().optional(),
  description: z.string().optional(),
  invite_link: z.string().optional()
})

export const inviteListSchema = z.array(inviteSchema)
