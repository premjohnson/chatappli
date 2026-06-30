import { useInfiniteQuery } from "@tanstack/react-query"
import { getMessagesApi } from "../api/getMessages.api"
import type { Message } from "../types/message.types"
import { useAuthStore } from "../../../store/auth.store"

export const useMessages = (conversationId?: string) => {

  const accessToken = useAuthStore((s) => s.accessToken)

  return useInfiniteQuery<Message[]>({

    queryKey: ["messages", conversationId],

    queryFn: ({ pageParam }) =>
      getMessagesApi(conversationId as string, {
        cursor: pageParam as string | undefined
      }),

    initialPageParam: undefined,

    getNextPageParam: (lastPage) => {

      if (!lastPage || lastPage.length < 20) {
        return undefined
      }

      // Return the oldest message ID on the page (index 0) since pages are in ascending order
      return lastPage[0]._id
    },

    enabled: Boolean(conversationId && accessToken),

    staleTime: 1000 * 60 * 5, // 5 minutes cache

  })
}