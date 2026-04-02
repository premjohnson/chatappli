import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createPrivateConversationApi } from "../api/createPrivateConversation.api"

export const useCreatePrivateConversation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPrivateConversationApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    }
  })
}