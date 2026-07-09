import { useInfiniteQuery } from "@tanstack/react-query"
import { useAuthStore } from "../../../store/auth.store"
import { getMessagesApi, type MessagesResponse } from "../api/getMessages.api"


export const useMessages = (conversationId?: string) => {

  const accessToken = useAuthStore((s) => s.accessToken)

  return useInfiniteQuery<MessagesResponse>({

    queryKey: ["messages", conversationId],

    queryFn: ({ pageParam }) =>
      getMessagesApi(conversationId as string, {
        cursor: pageParam as string | undefined
      }),

    initialPageParam: undefined,

    getNextPageParam: (lastPage) => {

      if (!lastPage?.pagination?.hasMore)
        return undefined

      return lastPage.pagination.nextCursor

    },

    enabled: Boolean(conversationId && accessToken),

    staleTime: 1000 * 60 * 5

  })

}