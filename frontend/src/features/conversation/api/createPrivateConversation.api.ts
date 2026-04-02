import api from "../../../lib/axios"
import type { CreatePrivateConversationPayload } from "../types/conversation.types"

export const createPrivateConversationApi = async (
  data: CreatePrivateConversationPayload
) => {
  const res = await api.post("/conversations/private", data)
  return res.data.data
}