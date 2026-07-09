import api from "../../../lib/axios"
import type { Message } from "../types/message.types"

interface Params {
  cursor?: string
}

export interface MessagesResponse {
  status: string
  results: number
  data: Message[]
  pagination: {
    nextCursor: string | null
    hasMore: boolean
  }
}

export const getMessagesApi = async (
  conversationId: string,
  params?: Params
): Promise<MessagesResponse> => {

  const res = await api.get(
    `/messages/${conversationId}`,
    {
      params
    }
  )

  return res.data

}