import { z } from 'zod'
import { AxiosError } from 'axios'
import { GraphSharePermission, urlJoin } from '@opencloud-eu/web-client'
import { GuestSession } from '@opencloud-eu/web-pkg'

const basePath = 'magic_guest_link_auth'

export const guestAuthEndpoints = {
  verifyToken: 'verify/token',
  verifyPin: 'verify/pin',
  renew: 'renew'
} as const

export function guestAuthUrl(serverUrl: string, endpoint: string): string {
  return urlJoin(serverUrl, basePath, endpoint)
}

export const guestSessionResponseSchema = z.object({
  share_id: z.string().min(1),
  share_name: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  // rejected rather than allowed through as NaN, which would look like a session that expired
  // the instant it was granted
  expires_at: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()))
})

export type GuestSessionResponse = z.infer<typeof guestSessionResponseSchema>

export const guestAuthErrorTypes = ['token_expired', 'session_expired'] as const
export type GuestAuthErrorType = (typeof guestAuthErrorTypes)[number]

const guestAuthErrorSchema = z.object({
  error_type: z.enum(guestAuthErrorTypes),
  share_id: z.string().optional()
})

/**
 * Carries only what the UI is allowed to act on. The server's `message` is deliberately
 * dropped: the resolve page must not surface anything about an invitation it hasn't
 * successfully authenticated.
 */
export class GuestAuthError extends Error {
  public readonly errorType: GuestAuthErrorType
  public readonly shareId: string
  public readonly statusCode: number

  constructor({
    errorType,
    shareId,
    statusCode
  }: {
    errorType?: GuestAuthErrorType
    shareId?: string
    statusCode?: number
  }) {
    super('guest authentication failed')
    this.errorType = errorType
    this.shareId = shareId
    this.statusCode = statusCode
  }
}

export function toGuestAuthError(error: unknown): GuestAuthError {
  const response = (error as AxiosError)?.response
  const parsed = guestAuthErrorSchema.safeParse(response?.data)

  return new GuestAuthError({
    statusCode: response?.status,
    errorType: parsed.success ? parsed.data.error_type : undefined,
    shareId: parsed.success ? parsed.data.share_id : undefined
  })
}

export function toGuestSession(data: GuestSessionResponse): GuestSession {
  return {
    shareId: data.share_id,
    shareName: data.share_name || 'share',
    permissions: (data.permissions || []) as GraphSharePermission[],
    expiresAt: new Date(data.expires_at).getTime()
  }
}
