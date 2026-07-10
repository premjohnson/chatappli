import api from "../../../lib/axios"

export const handleJoinRequestApi = async (
  conversationId: string,
  requesterId: string,
  action: "approve" | "reject"
) => {
  const res = await api.post(
    `/conversations/${conversationId}/requests`,
    { requesterId, action }
  )
  return res.data.data
}
