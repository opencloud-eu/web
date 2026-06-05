import { AxiosInstance } from 'axios'
import { z } from 'zod'
import { urlJoin } from '../utils'
import { Contact, ContactSchema, OxAutocompleteResponseSchema } from './types'

export * from './types'

// Open-Xchange contact column identifiers: id, display_name, email1, email2, email3.
// @see https://documentation.open-xchange.com/7.8.2/middleware/http_api/2_column_identifiers.html
const COLUMNS = '1,500,555,556,557'

export interface OX {
  autocompleteContacts(args: { query: string; signal?: AbortSignal }): Promise<Contact[]>
}

/**
 * Client for the Open-Xchange middleware HTTP API.
 *
 * The base url is resolved lazily through `getApiUrl` because it originates from
 * a server capability that is only available after the app has bootstrapped.
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
    }
  }
}
