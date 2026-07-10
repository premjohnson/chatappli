import api from "../../../lib/axios"

export const transferOwnershipApi = async (
  conversationId: string,
  userId: string
) => {
  const res = await api.patch(
    `/conversations/${conversationId}/transfer`,
    { userId }
  )
  return res.data.data
}
