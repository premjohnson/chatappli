import { getSocket, MESSAGE_EVENTS } from "./socket"
import { queryClient } from "./queryClient"
import type { Message } from "../features/message/types/message.types"
import { useChatStore } from "../store/chat.store"

export const registerSocketListeners = () => {

  const socket = getSocket()

  if (!socket) return

  // Unsubscribe from existing events to prevent multiple registrations
  socket.off(MESSAGE_EVENTS.NEW)
  socket.off(MESSAGE_EVENTS.DELIVERED)
  socket.off(MESSAGE_EVENTS.READ)
  socket.off("message:update")
  socket.off("presence:online")
  socket.off("presence:offline")
  socket.off("presence:sync")
  socket.off("typing:start")
  socket.off("typing:stop")
  socket.off("liveblock:update")

  /* ================= MESSAGE LISTENERS ================= */

  socket.on(MESSAGE_EVENTS.NEW, (message: Message) => {
    console.group("MESSAGE STATE UPDATE")
    console.log("source", "socket.message:new")
    console.log("messageId", message._id)
    console.log("conversationId", message.conversation)
    console.log("clientMessageId", message.clientMessageId)
    console.log("senderDeviceId", message.senderDeviceId)
    console.log("encryptedContent", Boolean(message.encryptedContent))
    console.log("nonce", Boolean(message.nonce))
    console.log("encryptedPayloads", message.encryptedPayloads)
    console.groupEnd()

    queryClient.setQueryData(
      ["messages", message.conversation],
      (old: any) => {
        if (!old || !old.pages) return old

        let exists = false
        let replaced = false

        // Map through pages and check if message already exists or replaces an optimistic one
        const pages = old.pages.map((page: Message[]) =>
          page.map((msg) => {
            if (msg._id === message._id) {
              exists = true
            }
            if (message.clientMessageId && msg.clientMessageId === message.clientMessageId) {
              replaced = true
              return message // Replace optimistic temporary message
            }
            return msg
          })
        )

        if (exists) return old

        if (replaced) {
          console.group("MESSAGE STATE UPDATE")
          console.log("source", "socket.message:new.replaceOptimistic")
          console.log("messageId", message._id)
          console.log("clientMessageId", message.clientMessageId)
          console.log("senderDeviceId", message.senderDeviceId)
          console.groupEnd()
          return { ...old, pages }
        }

        // Otherwise append the new message to pages[0] (ascending oldest-first order)
        const newPages = [...pages]
        if (newPages.length === 0) {
          newPages[0] = [message]
        } else {
          newPages[0] = [...newPages[0], message]
        }

        console.group("MESSAGE STATE UPDATE")
        console.log("source", "socket.message:new.append")
        console.log("messageId", message._id)
        console.log("clientMessageId", message.clientMessageId)
        console.log("senderDeviceId", message.senderDeviceId)
        console.groupEnd()

        return { ...old, pages: newPages }
      }
    )

    // Update conversations list query cache
    queryClient.setQueryData(["conversations"], (old: any) => {
      if (!Array.isArray(old)) return old
      return old.map((c: any) =>
        c._id === message.conversation
          ? { ...c, lastMessage: message, updatedAt: new Date().toISOString() }
          : c
      )
    })

    // Update Zustand store's latest messages mapping
    useChatStore.getState().setLatestMessage(message)

  })

  socket.on(MESSAGE_EVENTS.DELIVERED, (payload: { message: Message }) => {
    const { message } = payload
    if (!message) return

    console.group("MESSAGE STATE UPDATE")
    console.log("source", "socket.message:delivered")
    console.log("messageId", message._id)
    console.log("conversationId", message.conversation)
    console.log("clientMessageId", message.clientMessageId)
    console.log("senderDeviceId", message.senderDeviceId)
    console.log("encryptedPayloads", message.encryptedPayloads)
    console.groupEnd()

    queryClient.setQueryData(
      ["messages", message.conversation],
      (old: any) => {
        if (!old || !old.pages) return old
        const pages = old.pages.map((page: Message[]) =>
          page.map((msg) =>
            msg._id === message._id
              ? message
              : msg
          )
        )
        return { ...old, pages }
      }
    )

    queryClient.setQueryData(["conversations"], (old: any) => {
      if (!Array.isArray(old)) return old
      return old.map((c: any) =>
        c._id === message.conversation && c.lastMessage?._id === message._id
          ? { ...c, lastMessage: message }
          : c
      )
    })

    useChatStore.getState().setLatestMessage(message)
  })

  socket.on(MESSAGE_EVENTS.READ, (payload: { message: Message }) => {
    const { message } = payload
    if (!message) return

    console.group("MESSAGE STATE UPDATE")
    console.log("source", "socket.message:read")
    console.log("messageId", message._id)
    console.log("conversationId", message.conversation)
    console.log("clientMessageId", message.clientMessageId)
    console.log("senderDeviceId", message.senderDeviceId)
    console.log("encryptedPayloads", message.encryptedPayloads)
    console.groupEnd()

    queryClient.setQueryData(
      ["messages", message.conversation],
      (old: any) => {
        if (!old || !old.pages) return old
        const pages = old.pages.map((page: Message[]) =>
          page.map((msg) =>
            msg._id === message._id
              ? message
              : msg
          )
        )
        return { ...old, pages }
      }
    )

    queryClient.setQueryData(["conversations"], (old: any) => {
      if (!Array.isArray(old)) return old
      return old.map((c: any) =>
        c._id === message.conversation && c.lastMessage?._id === message._id
          ? { ...c, lastMessage: message }
          : c
      )
    })

    useChatStore.getState().setLatestMessage(message)
  })

  socket.on("message:update", (updatedMessage: Message) => {
    console.group("MESSAGE STATE UPDATE")
    console.log("source", "socket.message:update")
    console.log("messageId", updatedMessage._id)
    console.log("conversationId", updatedMessage.conversation)
    console.log("clientMessageId", updatedMessage.clientMessageId)
    console.log("senderDeviceId", updatedMessage.senderDeviceId)
    console.log("encryptedPayloads", updatedMessage.encryptedPayloads)
    console.groupEnd()

    queryClient.setQueryData(
      ["messages", updatedMessage.conversation],
      (old: any) => {
        if (!old || !old.pages) return old
        const pages = old.pages.map((page: Message[]) =>
          page.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg
          )
        )
        return { ...old, pages }
      }
    )

    queryClient.setQueryData(["conversations"], (old: any) => {
      if (!Array.isArray(old)) return old
      return old.map((c: any) =>
        c._id === updatedMessage.conversation && c.lastMessage?._id === updatedMessage._id
          ? { ...c, lastMessage: updatedMessage }
          : c
      )
    })
  })

  /* ================= PRESENCE LISTENERS ================= */

  socket.on("presence:online", ({ userId }: { userId: string }) => {
    useChatStore.getState().setPresence(userId, true)
  })

  socket.on("presence:offline", ({ userId }: { userId: string }) => {
    useChatStore.getState().setPresence(userId, false)
  })

  socket.on("presence:sync", (presenceMap: Record<string, boolean>) => {
    Object.entries(presenceMap).forEach(([userId, isOnline]) => {
      useChatStore.getState().setPresence(userId, isOnline)
    })
  })

  /* ================= TYPING LISTENERS ================= */

  socket.on("typing:start", ({ conversationId, userId }: { conversationId: string; userId: string }) => {
    useChatStore.getState().setTyping(conversationId, userId, true)
  })

  socket.on("typing:stop", ({ conversationId, userId }: { conversationId: string; userId: string }) => {
    useChatStore.getState().setTyping(conversationId, userId, false)
  })

  /* ================= LIVEBLOCKS LISTENERS ================= */

  socket.on("liveblock:update", (update: {
    blockId: string
    state: any
    version: number
    isFrozen: boolean
  }) => {
    queryClient.setQueryData(["liveblock", update.blockId], (old: any) => {
      if (!old) return old
      return {
        ...old,
        state: update.state,
        version: update.version,
        isFrozen: update.isFrozen,
      }
    })
  })

}
