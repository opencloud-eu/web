import { unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  useClientService,
  useLinkTypes,
  usePasswordPolicyService,
  useSharesStore
} from '@opencloud-eu/web-pkg'
import { CollaboratorAutoCompleteItem, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { renderGuestShareEmail } from './renderGuestShareEmail'

/**
 * Handles a guest (Open-Xchange contact) recipient by creating a public link
 * named after the guest's email address (default public link settings, with an
 * auto-generated password if the server enforces one) and emailing the link to
 * the guest via the OX MailCompose API.
 */
export const useInviteGuestViaEmail = () => {
  const clientService = useClientService()
  const { $gettext } = useGettext()
  const { defaultLinkType, isPasswordEnforcedForLinkType } = useLinkTypes()
  const passwordPolicyService = usePasswordPolicyService()
  const { addLink } = useSharesStore()

  const inviteGuest = async ({
    space,
    resource,
    guest
  }: {
    space: SpaceResource
    resource: Resource
    guest: CollaboratorAutoCompleteItem
  }) => {
    // For guests the id and mail both hold the email address.
    const email = guest.mail || guest.id

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

    const { subject, html } = renderGuestShareEmail(
      {
        contactName: guest.displayName,
        resourceName: resource.name,
        linkUrl: link.webUrl,
        password
      },
      $gettext
    )

    await clientService.ox.sendMail({
      to: { name: guest.displayName, email },
      subject,
      htmlContent: html
    })
  }

  return { inviteGuest }
}
