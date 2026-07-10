import api from "../../../lib/axios"

export interface InviteLinkOptions {
  expiresAt?: string
  maxUses?: number
}

export const generateInviteLinkApi = async (
  conversationId: string,
  options?: InviteLinkOptions
) => {
  const res = await api.post(
    `/conversations/${conversationId}/invite`,
    options || {}
  )
  return res.data.data
}
