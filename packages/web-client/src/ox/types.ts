import { z } from 'zod'

/**
 * A contact as returned by the Open-Xchange addressbook autocomplete endpoint,
 * normalized into a flat object.
 */
export const ContactSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string()
})
export type Contact = z.infer<typeof ContactSchema>

/**
 * Raw envelope of the Open-Xchange autocomplete response. `data` is a list of
 * column-value arrays, ordered according to the requested `columns` parameter.
 * @see https://documentation.open-xchange.com/components/middleware/http/8/index.html#!Addressbooks/doAutoCompleteContactsFromAddressbook
 */
export const OxAutocompleteResponseSchema = z.object({
  data: z.array(z.array(z.union([z.string(), z.number(), z.null()])))
})

/**
 * Response of opening an Open-Xchange mail composition space. `data.id`
 * identifies the space used for the subsequent send call.
 * @see https://documentation.open-xchange.com/8.21/middleware/mail/mail_compose.html
 */
export const OxComposeSpaceResponseSchema = z.object({
  data: z.object({ id: z.string() })
})
