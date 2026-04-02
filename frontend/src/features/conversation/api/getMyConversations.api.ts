import api from "../../../lib/axios"
import type { Conversation } from "../types/conversation.types"

export const getMyConversationsApi = async (): Promise<Conversation[]> => {
  const res = await api.get("/conversations")
  return res.data.data
}