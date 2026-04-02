import { useQuery } from "@tanstack/react-query"
import { getMyConversationsApi } from "../api/getMyConversations.api"
import type { Conversation } from "../types/conversation.types"
import { useAuthStore } from "../../../store/auth.store"

export const useMyConversations = () => {
  const accessToken = useAuthStore((s) => s.accessToken)

  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: getMyConversationsApi,
    enabled: !!accessToken
  })
}