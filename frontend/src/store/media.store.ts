import { create } from "zustand"

interface MediaViewerState {
  isOpen: boolean
  activeMessageId: string | null
  conversationId: string | null
  openViewer: (messageId: string, conversationId: string) => void
  closeViewer: () => void
  setActiveMessageId: (messageId: string | null) => void
}

export const useMediaViewerStore = create<MediaViewerState>((set) => ({
  isOpen: false,
  activeMessageId: null,
  conversationId: null,
  openViewer: (messageId, conversationId) => set({ isOpen: true, activeMessageId: messageId, conversationId }),
  closeViewer: () => set({ isOpen: false, activeMessageId: null, conversationId: null }),
  setActiveMessageId: (messageId) => set({ activeMessageId: messageId })
}))
