import type { Contact } from '../types'
import * as EmailValidator from 'email-validator'

export type ContactFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export type CreateContactPayload = Partial<Omit<Contact, 'id'>>

export const createEmptyContactFormState = (): ContactFormState => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: ''
})

export const hasContactFormValue = (state: ContactFormState) => {
  return [state.firstName, state.lastName, state.email, state.phone].some(
    (value) => value.trim().length > 0
  )
}

export const isContactEmailInvalid = (email: string) => {
  const trimmedEmail = email.trim()

  if (!trimmedEmail) {
    return false
  }

  return !EmailValidator.validate(trimmedEmail)
}

export const createContactPayload = (
  state: ContactFormState,
  addressBookId: string
): CreateContactPayload => {
  const firstName = state.firstName.trim()
  const lastName = state.lastName.trim()
  const email = state.email.trim()
  const phone = state.phone.trim()

  const nameComponents = [
    ...(firstName ? [{ kind: 'given', value: firstName }] : []),
    ...(firstName && lastName ? [{ kind: 'separator', value: ' ' }] : []),
    ...(lastName ? [{ kind: 'surname', value: lastName }] : [])
  ]

  return {
    addressBookIds: {
      [addressBookId]: true
    },
    kind: 'individual',
    ...(nameComponents.length
      ? {
          name: {
            components: nameComponents
          }
        }
      : {}),
    ...(email
      ? {
          emails: {
            e: {
              address: email
            }
          }
        }
      : {}),
    ...(phone
      ? {
          phones: {
            p: {
              number: phone
            }
          }
        }
      : {})
  }
}
