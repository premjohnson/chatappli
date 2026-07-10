import api from "../../../lib/axios"

export const revokeInviteLinkApi = async (
  conversationId: string,
  code: string
) => {
  const res = await api.post(
    `/conversations/${conversationId}/invite/revoke`,
    { code }
  )
  return res.data.data
}
