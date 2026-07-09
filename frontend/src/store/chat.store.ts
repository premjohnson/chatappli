import { create } from "zustand"
import type { Message } from "../features/message/types/message.types"

interface ChatState {
  activeConversationId: string | null
  setActiveConversation: (id: string | null) => void

  presenceMap: Record<string, boolean>
  setPresence: (userId: string, isOnline: boolean) => void

  typingMap: Record<string, string[]>
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void

    latestMessages: Record<string, Message>

    setLatestMessage: (message: Message) => void

    updateLatestMessageReceipts: (
      conversationId: string,
      messageId: string,
      deliveryReceipts: Message["deliveryReceipts"]
    ) => void
}

export const useChatStore = create<ChatState>((set, get) => ({

  activeConversationId: null,

  setActiveConversation: (id) => {
    const current = get().activeConversationId

    if (current === id) return

    console.log("ZUSTAND STATE UPDATE", {
      store: "chat",
      action: "setActiveConversation",
      previous: current,
      next: id
    })

    set({
      activeConversationId: id
    })
  },

  presenceMap: {},

  setPresence: (userId, isOnline) => {
    const current = get().presenceMap[userId]

    if (current === isOnline) return

    console.log("ZUSTAND STATE UPDATE", {
      store: "chat",
      action: "setPresence",
      userId,
      previous: current,
      next: isOnline
    })

    set((state) => ({
      presenceMap: {
        ...state.presenceMap,
        [userId]: isOnline
      }
    }))
  },

  typingMap: {},

  setTyping: (conversationId, userId, isTyping) => {

    const currentTypers = get().typingMap[conversationId] || []

    let newTypers: string[]

    if (isTyping) {

      if (currentTypers.includes(userId)) return

      newTypers = [...currentTypers, userId]

    } else {

      if (!currentTypers.includes(userId)) return

      newTypers = currentTypers.filter((id) => id !== userId)

    }

    console.log("ZUSTAND STATE UPDATE", {
      store: "chat",
      action: "setTyping",
      conversationId,
      userId,
      isTyping,
      previous: currentTypers,
      next: newTypers
    })

    set((state) => ({
      typingMap: {
        ...state.typingMap,
        [conversationId]: newTypers
      }
    }))
  },

  latestMessages: {},

setLatestMessage: (message) => {

  console.log("ZUSTAND STATE UPDATE", {
    store: "chat",
    action: "setLatestMessage",
    conversationId: message.conversation,
    messageId: message._id
  })

  set((state) => ({
    latestMessages: {
      ...state.latestMessages,
      [message.conversation]: message
    }
  }))
},
updateLatestMessageReceipts: (
  conversationId,
  messageId,
  deliveryReceipts
) => {

  set((state) => {

    const current = state.latestMessages[conversationId]

    if (!current) return state

    if (current._id !== messageId) return state

    if (current.deliveryReceipts === deliveryReceipts) {
        return state
      }
    console.log("ZUSTAND STATE UPDATE", {
      store: "chat",
      action: "updateLatestMessageReceipts",
      conversationId,
      messageId
    })

    return {
      latestMessages: {
        ...state.latestMessages,
        [conversationId]: {
          ...current,
          deliveryReceipts
        }
      }
    }

  })

},

}))
