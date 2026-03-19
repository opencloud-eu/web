import { z } from 'zod'

const webFingerLinkSchema = z.object({
  rel: z.string(),
  href: z.string().optional()
})

export const webFingerResponseSchema = z.object({
  subject: z.string(),
  links: z.array(webFingerLinkSchema).optional(),
  properties: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional()
})

export type WebFingerResponse = z.infer<typeof webFingerResponseSchema>
