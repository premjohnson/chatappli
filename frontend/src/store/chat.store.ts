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
}

export const useChatStore = create<ChatState>((set, get) => ({

  activeConversationId: null,

  setActiveConversation: (id) => {
    const current = get().activeConversationId

    if (current === id) return

    set({
      activeConversationId: id
    })
  },

  presenceMap: {},

  setPresence: (userId, isOnline) => {
    const current = get().presenceMap[userId]

    if (current === isOnline) return

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

    set((state) => ({
      typingMap: {
        ...state.typingMap,
        [conversationId]: newTypers
      }
    }))
  },

  latestMessages: {},

  setLatestMessage: (message) => {

    const current = get().latestMessages[message.conversation]

    if (current?._id === message._id) return

    set((state) => ({
      latestMessages: {
        ...state.latestMessages,
        [message.conversation]: message
      }
    }))
  }

}))