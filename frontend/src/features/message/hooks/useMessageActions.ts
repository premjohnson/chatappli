import { useMutation, useQueryClient } from "@tanstack/react-query"
import { editMessageApi } from "../api/editMessage.api"
import { deleteForMeApi } from "../api/deleteForMe.api"
import { deleteForEveryoneApi } from "../api/deleteForEveryone.api"
import { reactToMessageApi, togglePinApi, toggleStarApi } from "../api/messageActions.api"
import type { Message } from "../types/message.types"

export const useMessageActions = (conversationId: string) => {
  const queryClient = useQueryClient()

  // Helper: update message inside pages query cache
  const updateMessageInCache = (updatedMessage: Message) => {
    queryClient.setQueryData(["messages", conversationId], (old: any) => {
      if (!old || !old.pages) return old
      const pages = old.pages.map((page: any) => ({
        ...page,
        data: page.data.map((msg: Message) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        )
      }))
      return { ...old, pages }
    })

    // Also update last message in conversation sidebar list
    queryClient.setQueryData(["conversations"], (oldConversations: any) => {
      if (!Array.isArray(oldConversations)) return oldConversations
      return oldConversations.map((c: any) =>
        c._id === conversationId && c.lastMessage?._id === updatedMessage._id
          ? { ...c, lastMessage: updatedMessage }
          : c
      )
    })
  }

  // Helper: remove message from query cache
  const removeMessageFromCache = (messageId: string) => {
    queryClient.setQueryData(["messages", conversationId], (old: any) => {
      if (!old || !old.pages) return old
      const pages = old.pages.map((page: any) => ({
        ...page,
        data: page.data.filter((msg: Message) => msg._id !== messageId)
      }))
      return { ...old, pages }
    })
  }

  const editMessage = useMutation<Message, Error, { messageId: string; encryptedContent: string; nonce: string; encryptedPayloads?: any }>({
    mutationFn: ({ messageId, encryptedContent, nonce, encryptedPayloads }) =>
      editMessageApi(messageId, encryptedContent, nonce, encryptedPayloads),
    onSuccess: (data) => updateMessageInCache(data)
  })

  const deleteForMe = useMutation<void, Error, { messageId: string }>({
    mutationFn: ({ messageId }) => deleteForMeApi(messageId),
    onSuccess: (_, variables) => removeMessageFromCache(variables.messageId)
  })

  const deleteForEveryone = useMutation<Message, Error, { messageId: string }>({
    mutationFn: ({ messageId }) => deleteForEveryoneApi(messageId),
    onSuccess: (data) => updateMessageInCache(data)
  })

  const reactToMessage = useMutation<Message, Error, { messageId: string; emoji: string }>({
    mutationFn: ({ messageId, emoji }) => reactToMessageApi(messageId, emoji),
    onSuccess: (data) => updateMessageInCache(data)
  })

  const togglePin = useMutation<Message, Error, { messageId: string }>({
    mutationFn: ({ messageId }) => togglePinApi(messageId),
    onSuccess: (data) => updateMessageInCache(data)
  })

  const toggleStar = useMutation<Message, Error, { messageId: string }>({
    mutationFn: ({ messageId }) => toggleStarApi(messageId),
    onSuccess: (data) => updateMessageInCache(data)
  })

  return {
    editMessage,
    deleteForMe,
    deleteForEveryone,
    reactToMessage,
    togglePin,
    toggleStar
  }
}
