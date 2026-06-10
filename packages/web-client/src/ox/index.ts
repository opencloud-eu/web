import { AxiosInstance } from 'axios'
import { z } from 'zod'
import { urlJoin } from '../utils'
import {
  Contact,
  ContactSchema,
  OxAutocompleteResponseSchema,
  OxComposeSpaceResponseSchema
} from './types'

export * from './types'

// Open-Xchange contact column identifiers: id, display_name, email1, email2, email3.
// @see https://documentation.open-xchange.com/7.8.2/middleware/http_api/2_column_identifiers.html
const COLUMNS = '1,500,555,556,557'

export interface OXMailRecipient {
  name?: string
  email: string
}

export interface OX {
  autocompleteContacts(args: { query: string; signal?: AbortSignal }): Promise<Contact[]>
  sendMail(args: {
    to: OXMailRecipient
    subject: string
    htmlContent: string
    signal?: AbortSignal
  }): Promise<void>
}

/**
 * Client for the Open-Xchange middleware HTTP API.
 *
 * The base url is resolved lazily through `getApiUrl` because it originates from
 * a config option that is only available after the app has bootstrapped.
 */
export const ox = (axiosClient: AxiosInstance, getApiUrl: () => string | undefined): OX => {
  return {
    async autocompleteContacts({ query, signal }) {
      const apiUrl = getApiUrl()
      if (!apiUrl) {
        return []
      }

      const { data } = await axiosClient.get(urlJoin(apiUrl, 'addressbooks'), {
        params: { action: 'autocomplete', query, columns: COLUMNS, email: true },
        signal
      })

      const { data: rows } = OxAutocompleteResponseSchema.parse(data)
      const contacts = rows
        .map(([id, displayName, email1, email2, email3]) => ({
          id: String(id ?? ''),
          displayName: String(displayName ?? ''),
          email: String(email1 || email2 || email3 || '')
        }))
        .filter((contact) => !!contact.email)

      return z.array(ContactSchema).parse(contacts)
    },

    async sendMail({ to, subject, htmlContent, signal }) {
      const apiUrl = getApiUrl()
      if (!apiUrl) {
        throw new Error('Open-Xchange API url is not configured')
      }

      // 1. open a new composition space
      const { data: openData } = await axiosClient.post(urlJoin(apiUrl, 'mail', 'compose'), [], {
        params: { type: 'new' },
        signal
      })
      const { data: space } = OxComposeSpaceResponseSchema.parse(openData)

      // 2. send the message (recipients are [displayName, email] tuples per the OX Address schema)
      const formData = new FormData()
      formData.append(
        'JSON',
        JSON.stringify({
          to: [[to.name ?? '', to.email]],
          subject,
          content: htmlContent,
          contentType: 'text/html'
        })
      )

      await axiosClient.post(urlJoin(apiUrl, 'mail', 'compose', space.id, 'send'), formData, {
        signal
      })
    }
  }
}
