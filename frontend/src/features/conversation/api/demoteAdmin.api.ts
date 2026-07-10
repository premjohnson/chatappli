import api from "../../../lib/axios"

export const demoteAdminApi = async (
  conversationId: string,
  userId: string
) => {
  const res = await api.patch(
    `/conversations/${conversationId}/demote`,
    { userId }
  )
  return res.data.data
}
