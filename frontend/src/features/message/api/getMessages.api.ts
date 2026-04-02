import api from "../../../lib/axios"
import type { Message } from "../types/message.types"

interface Params {
  cursor?: string
}

export const getMessagesApi = async (
  conversationId: string,
  params?: Params
): Promise<Message[]> => {

  const res = await api.get(`/messages/${conversationId}`, {
    params
  })

  return res.data.data
}