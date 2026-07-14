import { create } from "zustand"
import type { Message } from "../features/message/types/message.types"

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  message: Message | null
  messageElement: HTMLElement | null
  openContextMenu: (message: Message, element: HTMLElement) => void
  closeMenu: () => void
  reconcileMessage: (message: Message) => void
  removeMessage: (messageId: string) => void
  selectedMessageIds: string[]
  isSelectionMode: boolean
  toggleSelectMessage: (messageId: string) => void
  clearSelection: () => void
  setSelectionMode: (enabled: boolean) => void
  replyingToMessage: Message | null
  setReplyingToMessage: (message: Message | null) => void
  editingMessage: Message | null
  setEditingMessage: (message: Message | null) => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  x: 0,
  y: 0,
  message: null,
  messageElement: null,
  openContextMenu: (message, element) => {
    console.log("[RUNTIME LOG] openContextMenu() executes", {
      selectedMessage: {
        _id: message._id,
        clientMessageId: message.clientMessageId,
        text: message.encryptedContent ? "(encrypted)" : ""
      },
      element
    })
    set({ isOpen: true, message, messageElement: element })
  },
  closeMenu: () => set({ isOpen: false, message: null, messageElement: null }),
  reconcileMessage: (message) => set((state) => {
    const matches = (candidate: Message | null) => Boolean(candidate && (
      candidate._id === message._id ||
      (candidate.clientMessageId && candidate.clientMessageId === message.clientMessageId)
    ))
    const oldSelectedId = matches(state.message) ? state.message!._id : undefined

    return {
      message: matches(state.message) ? message : state.message,
      replyingToMessage: matches(state.replyingToMessage) ? message : state.replyingToMessage,
      editingMessage: matches(state.editingMessage) ? message : state.editingMessage,
      selectedMessageIds: state.selectedMessageIds.map((id) =>
        id === oldSelectedId || (message.clientMessageId && id === message.clientMessageId)
          ? message._id
          : id
      )
    }
  }),
  removeMessage: (messageId) => set((state) => {
    const isSelected = state.message?._id === messageId
    return {
      isOpen: isSelected ? false : state.isOpen,
      message: isSelected ? null : state.message,
      messageElement: isSelected ? null : state.messageElement,
      selectedMessageIds: state.selectedMessageIds.filter((id) => id !== messageId),
      replyingToMessage: state.replyingToMessage?._id === messageId ? null : state.replyingToMessage,
      editingMessage: state.editingMessage?._id === messageId ? null : state.editingMessage
    }
  }),
  selectedMessageIds: [],
  isSelectionMode: false,
  toggleSelectMessage: (messageId) => set((state) => {
    const ids = state.selectedMessageIds.includes(messageId)
      ? state.selectedMessageIds.filter(id => id !== messageId)
      : [...state.selectedMessageIds, messageId]
    return { selectedMessageIds: ids }
  }),
  clearSelection: () => set({ selectedMessageIds: [], isSelectionMode: false }),
  setSelectionMode: (enabled) => set({ isSelectionMode: enabled, selectedMessageIds: [] }),
  replyingToMessage: null,
  setReplyingToMessage: (message) => set({ replyingToMessage: message }),
  editingMessage: null,
  setEditingMessage: (message) => set({ editingMessage: message })
}))
