import api from "../../../lib/axios"

export const promoteAdminApi = async (
  conversationId: string,
  userId: string
) => {

  const res = await api.patch(
    `/conversations/${conversationId}/promote`,
    { userId }
  )

  return res.data.data
}