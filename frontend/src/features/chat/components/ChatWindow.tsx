import { useChatStore } from "../../../store/chat.store"
import { useAuthStore } from "../../../store/auth.store"
import { ChatHeader } from "./ChatHeader"
import MessageList from "../../message/components/MessageList"
import { MessageInput } from "../../message/components/MessageInput"
import UserInfoPanel from "./UserInfoPanel"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import { markAsReadApi } from "../../message/api/markAsRead.api"
import { joinConversationRoom, leaveConversationRoom } from "../../../lib/socket"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"

export function ChatWindow() {
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const presenceMap = useChatStore((s) => s.presenceMap)
  const currentUser = useAuthStore((s) => s.user)
  const { data: conversations } = useMyConversations()
  const [showUserInfo, setShowUserInfo] = useState(false)

  const currentConvo = conversations?.find((c: Conversation) => c._id === activeConversationId)
  const receiver = currentConvo?.participants.find((p: ConversationParticipant) => p._id !== currentUser?.id)
  const receiverId = receiver?._id || ""
  const isOnline = presenceMap[receiverId] || false
  const markedConvosRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (activeConversationId) {
      joinConversationRoom(activeConversationId)
      if (!markedConvosRef.current.has(activeConversationId)) {
        markedConvosRef.current.add(activeConversationId)
        markAsReadApi(activeConversationId).catch((e) => console.error(e))
      }
      return () => { leaveConversationRoom(activeConversationId) }
    }
  }, [activeConversationId])

  return (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-2xl rounded-[2.5rem] relative overflow-hidden border border-white/40 shadow-premium">
      {activeConversationId ? (
        <>
          <ChatHeader
            conversationId={activeConversationId}
            onOpenUserInfo={() => setShowUserInfo(true)}
          />

          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <MessageList conversationId={activeConversationId} />
          </div>

          <MessageInput conversationId={activeConversationId} />

          <AnimatePresence>
            {showUserInfo && receiver && (
              <UserInfoPanel
                participant={receiver}
                isOnline={isOnline}
                onClose={() => setShowUserInfo(false)}
              />
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-[2rem] bg-brand-primary/5 flex items-center justify-center mb-6"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/20" />
          </motion.div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">Your Workspace</h3>
          <p className="text-gray-500 max-w-[240px] leading-relaxed">
            Select a conversation from the sidebar to start your secure chat session.
          </p>
        </div>
      )}
    </div>
  )
}
