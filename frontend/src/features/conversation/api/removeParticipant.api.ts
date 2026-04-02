import api from "../../../lib/axios"

export const removeParticipantApi = async (
  conversationId: string,
  userId: string
) => {

  const res = await api.delete(
    `/conversations/${conversationId}/members/${userId}`
  )

  return res.data.data
}