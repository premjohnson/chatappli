import { create } from "zustand"
import type { Message } from "../features/message/types/message.types"

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  message: Message | null
  openMenu: (x: number, y: number, message: Message) => void
  closeMenu: () => void
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
  openMenu: (x, y, message) => set({ isOpen: true, x, y, message }),
  closeMenu: () => set({ isOpen: false, message: null }),
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
