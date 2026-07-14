import { getSocket, MESSAGE_EVENTS } from "./socket"
import { queryClient } from "./queryClient"
import type { Message } from "../features/message/types/message.types"
import { useChatStore } from "../store/chat.store"
import { useAuthStore } from "../store/auth.store"
import { isParticipantCurrentUser } from "../features/conversation/types/conversation.types"
import { decryptMessage } from "../utils/crypto"
import { useContextMenuStore } from "../store/contextMenu.store"

export const registerSocketListeners = () => {

  const socket = getSocket()

  if (!socket) return

  // Unsubscribe from existing events to prevent multiple registrations
  socket.off("connect")
  socket.off(MESSAGE_EVENTS.NEW)
  socket.off(MESSAGE_EVENTS.DELIVERED)
  socket.off(MESSAGE_EVENTS.READ)
  socket.off("message:update")
  socket.off("message:deleteForMe")
  socket.off("presence:online")
  socket.off("presence:offline")
  socket.off("presence:sync")
  socket.off("typing:start")
  socket.off("typing:stop")
  socket.off("liveblock:update")

  /* ================= CONNECTION LISTENERS ================= */

  socket.on("connect", () => {
    console.log("[Socket] Reconnected, rejoining active conversation room")
    const activeConversationId = useChatStore.getState().activeConversationId
    if (activeConversationId) {
      socket.emit("join:room", { conversationId: activeConversationId })
      queryClient.invalidateQueries({ queryKey: ["messages", activeConversationId] })
    }
    queryClient.invalidateQueries({ queryKey: ["conversations"] })
  })

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
        const pages = old.pages.map((page: any) => {
          const newData = page.data.map((msg: Message) => {
            if (msg._id === message._id) {
              exists = true
              return message // Reconcile/update
            }
            if (message.clientMessageId && msg.clientMessageId === message.clientMessageId) {
              replaced = true
              return message // Replace optimistic temporary message
            }
            return msg
          })
          return { ...page, data: newData }
        })

        if (exists) {
          return { ...old, pages }
        }

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
          newPages[0] = {
            data: [message],
            pagination: {
              nextCursor: null,
              hasMore: false
            }
          }
        } else {
          newPages[0] = {
            ...newPages[0],
            data: [...newPages[0].data, message]
          }
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
      const activeConversationId = useChatStore.getState().activeConversationId
      const currentUserId = useAuthStore.getState().user?.id
      return old.map((c: any) => {
        if (c._id === message.conversation) {
          const isSender = message.sender === currentUserId
          const isCurrentActive = message.conversation === activeConversationId

          const updatedParticipants = c.participants.map((p: any) => {
            if (isParticipantCurrentUser(p, currentUserId)) {
              const isMuted = p.isMuted || (p.muteUntil && new Date(p.muteUntil) > new Date())
              const currentUnread = p.unreadCount || 0
              return {
                ...p,
                unreadCount: (isSender || isCurrentActive || isMuted) ? 0 : currentUnread + 1
              }
            }
            return p
          })

          return {
            ...c,
            lastMessage: message,
            updatedAt: new Date().toISOString(),
            participants: updatedParticipants
          }
        }
        return c
      })
    })

    // Update Zustand store's latest messages mapping
    useChatStore.getState().setLatestMessage(message)

    // Trigger Browser Notification if appropriate
    const activeConversationId = useChatStore.getState().activeConversationId
    const currentUserId = useAuthStore.getState().user?.id
    const isSender = message.sender === currentUserId
    const isCurrentActive = message.conversation === activeConversationId

    if (!isSender && (!isCurrentActive || document.visibilityState !== "visible")) {
      const conversations = queryClient.getQueryData<any[]>(["conversations"])
      const convo = conversations?.find((c: any) => c._id === message.conversation)
      if (convo) {
        const participant = convo.participants.find((p: any) => isParticipantCurrentUser(p, currentUserId))
        const isMuted = participant?.isMuted || (participant?.muteUntil && new Date(participant.muteUntil) > new Date())

        if (!isMuted) {
          let bodyText = "New secure message"
          try {
            const identityPrivateKey = useAuthStore.getState().identityPrivateKey
            const currentDeviceId = useAuthStore.getState().deviceId
            if (identityPrivateKey && currentDeviceId && message.encryptedPayloads?.length) {
              const payload = message.encryptedPayloads.find((p: any) => p.recipientDeviceId === currentDeviceId)
              if (payload) {
                let publicKey: string | null = null
                if (message.senderDeviceId) {
                  const cachedGroupDevices = queryClient.getQueryData<any[]>(["devices", "group", message.conversation])
                  const senderDeviceInGroup = cachedGroupDevices?.find(d => d.deviceId === message.senderDeviceId)
                  if (senderDeviceInGroup) {
                    publicKey = senderDeviceInGroup.publicKey
                  } else {
                    const cachedUserDevices = queryClient.getQueryData<any[]>(["devices", "user", message.sender])
                    const senderDevice = cachedUserDevices?.find(d => d.deviceId === message.senderDeviceId)
                    if (senderDevice) {
                      publicKey = senderDevice.publicKey
                    }
                  }
                }

                if (publicKey) {
                  const decrypted = decryptMessage(
                    payload.encryptedContent,
                    payload.nonce,
                    publicKey,
                    identityPrivateKey
                  )
                  try {
                    const parsed = JSON.parse(decrypted)
                    if (parsed.text) {
                      bodyText = parsed.text
                    } else if (parsed.file) {
                      bodyText = `Sent an attachment: ${parsed.file.fileName}`
                    }
                  } catch {
                    bodyText = decrypted
                  }
                }
              }
            }
          } catch (err) {
            console.warn("Failed to decrypt message for notification:", err)
          }

          if (Notification.permission === "granted") {
            new Notification(convo.type === "group" ? convo.groupName || "Group Chat" : "New Secure Message", {
              body: bodyText,
              icon: "/favicon.ico"
            })
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission()
          }
        }
      }
    }

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
        const pages = old.pages.map((page: any) => ({
          ...page,
          data: page.data.map((msg: Message) =>
            msg._id === message._id
              ? {
                  ...msg,
                  deliveryReceipts: message.deliveryReceipts
                }
              : msg
          )
        }))
        return { ...old, pages }
      }
    )

    queryClient.setQueryData(["conversations"], (old: any) => {
      if (!Array.isArray(old)) return old
      return old.map((c: any) =>
        c._id === message.conversation && c.lastMessage?._id === message._id
          ? {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                deliveryReceipts: message.deliveryReceipts
              }
            }
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
        const pages = old.pages.map((page: any) => ({
          ...page,
          data: page.data.map((msg: Message) =>
            msg._id === message._id
              ? {
                  ...msg,
                  deliveryReceipts: message.deliveryReceipts
                }
              : msg
          )
        }))
        return { ...old, pages }
      }
    )

    queryClient.setQueryData(["conversations"], (old: any) => {
      if (!Array.isArray(old)) return old
      return old.map((c: any) =>
        c._id === message.conversation && c.lastMessage?._id === message._id
          ? {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                deliveryReceipts: message.deliveryReceipts
              }
            }
          : c
      )
    })

    useChatStore.getState().setLatestMessage(message)
  })

  socket.on("message:update", (updatedMessage: Message) => {
    const currentSelectedId = useContextMenuStore.getState().message?._id || useContextMenuStore.getState().message?.clientMessageId
    console.log("[RUNTIME LOG] Socket.IO receives message:update", {
      incomingMessageId: updatedMessage._id,
      currentSelectedId
    })
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
        const pages = old.pages.map((page: any) => ({
          ...page,
          data: page.data.map((msg: Message) =>
            msg._id === updatedMessage._id ? updatedMessage : msg
          )
        }))
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

  socket.on("message:deleteForMe", ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
    queryClient.setQueryData(
      ["messages", conversationId],
      (old: any) => {
        if (!old || !old.pages) return old
        const pages = old.pages.map((page: any) => ({
          ...page,
          data: page.data.filter((msg: Message) => msg._id !== messageId)
        }))
        return { ...old, pages }
      }
    )
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

  /* ================= GROUP LISTENERS ================= */

  socket.on("group:update", () => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] })
    queryClient.invalidateQueries({ queryKey: ["group-devices"] })
  })

  socket.on("group:member:add", () => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] })
    queryClient.invalidateQueries({ queryKey: ["group-devices"] })
  })

  socket.on("group:member:remove", () => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] })
    queryClient.invalidateQueries({ queryKey: ["group-devices"] })
  })

  socket.on("group:member:role", () => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] })
    queryClient.invalidateQueries({ queryKey: ["group-devices"] })
  })

  socket.on("group:permission:update", () => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] })
    queryClient.invalidateQueries({ queryKey: ["group-devices"] })
  })

}
