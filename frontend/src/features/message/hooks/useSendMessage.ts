import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sendMessageApi } from "../api/sendMessage.api"
import { useAuthStore } from "../../../store/auth.store"
import type { EncryptedPayload, Message } from "../types/message.types"
import type { Conversation } from "../../conversation/types/conversation.types"

    interface SendMessagePayload {
      conversationId: string;

      // Legacy (temporary)
      encryptedContent?: string;
      nonce?: string;

      // New multi-device payload
      encryptedPayloads?: EncryptedPayload[];

      clientMessageId: string;
      type?: string;
      senderDeviceId?: string;
      signature?: string;
    }
export const useSendMessage = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation<Message, Error, SendMessagePayload, { previousMessages: unknown; conversationId: string }>({
    mutationFn: sendMessageApi,

    onMutate: async (newMsgPayload: SendMessagePayload) => {
      await queryClient.cancelQueries({ queryKey: ["messages", newMsgPayload.conversationId] })

      const previousMessages = queryClient.getQueryData(["messages", newMsgPayload.conversationId])

      console.group("MESSAGE STATE UPDATE")
      console.log("source", "useSendMessage.onMutate")
      console.log("conversationId", newMsgPayload.conversationId)
      console.log("clientMessageId", newMsgPayload.clientMessageId)
      console.log("payloadSenderDeviceId", newMsgPayload.senderDeviceId)
      console.log("payloadEncryptedContent", Boolean(newMsgPayload.encryptedContent))
      console.log("payloadNonce", Boolean(newMsgPayload.nonce))
      console.log("payloadEncryptedPayloads", newMsgPayload.encryptedPayloads)
      console.log("previousPages", (previousMessages as { pages?: Message[][] } | undefined)?.pages?.map(
        (page) => page.map((msg) => ({
          id: msg._id,
          clientMessageId: msg.clientMessageId,
          senderDeviceId: msg.senderDeviceId
        }))
      ))
      console.groupEnd()

      queryClient.setQueryData(
        ["messages", newMsgPayload.conversationId],
        (old: { pages: Message[][], pageParams: unknown[] } | undefined) => {
          if (!old || !old.pages) return old

          // Optimistic ephemeral message structure
          const optimisticMsg: Message = {
            _id: `temp-${Date.now()}`,
            conversation: newMsgPayload.conversationId,
            sender: user?.id || "",
            senderDeviceId: newMsgPayload.senderDeviceId, 
            encryptedContent:
              newMsgPayload.encryptedContent ?? "",

            nonce:
              newMsgPayload.nonce ?? "",

            encryptedPayloads:
              newMsgPayload.encryptedPayloads ?? [],
            type: (newMsgPayload.type as "text" | "image" | "file" | "system") || "text",
            deliveryReceipts: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            clientMessageId: newMsgPayload.clientMessageId
          }

          console.group("MESSAGE STATE UPDATE")
          console.log("source", "useSendMessage.onMutate.optimisticMessage")
          console.log("messageId", optimisticMsg._id)
          console.log("clientMessageId", optimisticMsg.clientMessageId)
          console.log("payloadSenderDeviceId", newMsgPayload.senderDeviceId)
          console.log("optimisticSenderDeviceId", optimisticMsg.senderDeviceId)
          console.log("encryptedPayloads", optimisticMsg.encryptedPayloads)
          console.groupEnd()

          // In infinite queries, pages[0] contains the NEWEST messages on that page.
          // Since the API returns the messages in ascending order (oldest first),
          // we append (push) the optimistic message to the end of pages[0].
          const newPages = [...old.pages]
          newPages[0] = [...newPages[0], optimisticMsg]

          return {
            ...old,
            pages: newPages
          }
        }
      )

      return { previousMessages, conversationId: newMsgPayload.conversationId }
    },

    // ✅ On success, replace optimistic message with real message
    onSuccess: (newMessage: Message, variables: SendMessagePayload) => {
      console.group("MESSAGE STATE UPDATE")
      console.log("source", "useSendMessage.onSuccess")
      console.log("conversationId", variables.conversationId)
      console.log("clientMessageId", variables.clientMessageId)
      console.log("payloadSenderDeviceId", variables.senderDeviceId)
      console.log("newMessageId", newMessage._id)
      console.log("newMessageSenderDeviceId", newMessage.senderDeviceId)
      console.log("newMessageEncryptedPayloads", newMessage.encryptedPayloads)
      console.groupEnd()

      queryClient.setQueryData(
        ["messages", variables.conversationId],
        (old: { pages: Message[][], pageParams: unknown[] } | undefined) => {
          if (!old || !old.pages) return old

          console.group("MESSAGE STATE UPDATE")
          console.log("source", "useSendMessage.onSuccess.replaceOptimistic")
          console.log("oldPages", old.pages.map((page) => page.map((msg) => ({
            id: msg._id,
            clientMessageId: msg.clientMessageId,
            senderDeviceId: msg.senderDeviceId
          }))))
          console.log("replacement", {
            id: newMessage._id,
            clientMessageId: newMessage.clientMessageId,
            senderDeviceId: newMessage.senderDeviceId
          })
          console.groupEnd()

          return {
            ...old,
            pages: old.pages.map(page =>
              page.map(msg =>
                msg._id.startsWith("temp-") && msg.clientMessageId === variables.clientMessageId
                  ? newMessage  // Replace optimistic with real
                  : msg
              )
            )
          }
        }
      )

      // Update conversations cache with new message
      queryClient.setQueryData(
        ["conversations"],
        (old: Conversation[] | undefined) => {
          if (!Array.isArray(old)) return old
          return old.map(c =>
            c._id === variables.conversationId
              ? {
                ...c,
                lastMessage: newMessage,
                updatedAt: new Date().toISOString()
              }
              : c
          )
        }
      )
    },

    onError: (_err: Error, _newMsg: SendMessagePayload, context?: { previousMessages: unknown; conversationId: string }) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", context.conversationId], context.previousMessages)
      }
    }

    // ✅ Removed onSettled invalidation - no need to re-fetch after success with updated cache
  })
}
