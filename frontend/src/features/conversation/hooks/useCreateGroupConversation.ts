import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createGroupConversationApi } from "../api/createGroupConversation.api"
import type { Conversation } from "../types/conversation.types"

export const useCreateGroupConversation = () => {

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createGroupConversationApi,

    onSuccess: (newConversation: Conversation) => {

      // update conversation list cache

      queryClient.setQueryData<Conversation[]>(
        ["conversations"],
        (old) => {

          if (!old) return [newConversation]

          return [newConversation, ...old]
        }
      )
    }
  })
}