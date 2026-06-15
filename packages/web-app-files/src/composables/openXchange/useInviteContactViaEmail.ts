import { unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import {
  useClientService,
  useLinkTypes,
  usePasswordPolicyService,
  useSharesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { CollaboratorAutoCompleteItem, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { renderContactShareEmail } from './renderContactShareEmail'

/**
 * Handles an address book contact (e.g. Open-Xchange) recipient by creating a
 * public link named after the contact's email address (default public link
 * settings, with an auto-generated password if the server enforces one) and
 * emailing the link to the contact via the OX MailCompose API.
 *
 * Such recipients are never OpenCloud users, so no collaborator share is created.
 */
export const useInviteContactViaEmail = () => {
  const clientService = useClientService()
  const { $gettext } = useGettext()
  const { defaultLinkType, isPasswordEnforcedForLinkType } = useLinkTypes()
  const passwordPolicyService = usePasswordPolicyService()
  const { addLink } = useSharesStore()
  const { user } = storeToRefs(useUserStore())

  const inviteContact = async ({
    space,
    resource,
    contact
  }: {
    space: SpaceResource
    resource: Resource
    contact: CollaboratorAutoCompleteItem
  }) => {
    // For contacts the id and mail both hold the email address.
    const email = contact.mail || contact.id

    const type = unref(defaultLinkType)
    const password = isPasswordEnforcedForLinkType(type)
      ? passwordPolicyService.generatePassword()
      : undefined

    const link = await addLink({
      clientService,
      space,
      resource,
      options: { displayName: email, type, ...(password && { password }) }
    })

    const { subject, html } = renderContactShareEmail(
      {
        contactName: contact.displayName,
        resourceName: resource.name,
        linkUrl: link.webUrl,
        password
      },
      $gettext
    )

    await clientService.ox.sendMail({
      from: { name: unref(user)?.displayName, email: unref(user)?.mail },
      to: { name: contact.displayName, email },
      subject,
      htmlContent: html
    })
  }

  return { inviteContact }
}
