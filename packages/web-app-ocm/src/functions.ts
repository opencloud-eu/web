import { FederatedConnection, FederatedUser } from '@opencloud-eu/web-pkg'

const getConnectionId = (user: FederatedUser) => {
  return `${user.user_id}@${user.idp}`
}

export const buildConnection = (user: FederatedUser): FederatedConnection => {
  return {
    id: getConnectionId(user),
    ...user
  }
}
