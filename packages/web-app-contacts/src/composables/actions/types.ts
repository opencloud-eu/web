import type { Action } from '@opencloud-eu/web-pkg'
import type { Contact } from '../../types'

export type ContactActionOptions = {
  resources: Contact[]
}
export type ContactAction = Action<ContactActionOptions>
