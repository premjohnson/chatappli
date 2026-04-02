import api from "../../../lib/axios"

export const deleteConversationApi = async (
  conversationId: string
) => {

  const res = await api.delete(
    `/conversations/${conversationId}`
  )

  return res.data.data
}