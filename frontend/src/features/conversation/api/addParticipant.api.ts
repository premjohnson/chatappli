import api from "../../../lib/axios"

export const addParticipantApi = async (
  conversationId: string,
  userId: string
) => {

  const res = await api.post(
    `/conversations/${conversationId}/members`,
    { userId }
  )

  return res.data.data
}