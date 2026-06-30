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
import { Shield, Lock, Key } from "lucide-react"
import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"
import { getParticipantUserId, isParticipantCurrentUser } from "../../conversation/types/conversation.types"

export function ChatWindow() {
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const presenceMap = useChatStore((s) => s.presenceMap)
  const currentUser = useAuthStore((s) => s.user)
  const { data: conversations } = useMyConversations()
  const [showUserInfo, setShowUserInfo] = useState(false)

  const currentConvo = conversations?.find((c: Conversation) => c._id === activeConversationId)
  const receiver = currentConvo?.participants.find((p: ConversationParticipant) => !isParticipantCurrentUser(p, currentUser?.id))
  const receiverId = getParticipantUserId(receiver)
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
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="w-24 h-24 rounded-[2.5rem] bg-brand-primary/10 flex items-center justify-center mb-8 border border-brand-primary/20 relative"
          >
            <Shield className="w-10 h-10 text-brand-primary" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
              className="absolute -inset-2 rounded-[3rem] border border-dashed border-brand-primary/30 pointer-events-none"
            />
          </motion.div>

          <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-3">
            Secure Communication Workspace
          </h3>
          <p className="text-gray-500 max-w-[320px] leading-relaxed text-sm font-medium mb-8">
            Select a conversation from the sidebar to establish a secure, end-to-end encrypted chat session.
          </p>

          {/* Core Security Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full text-left">
            <div className="p-4 rounded-2xl bg-white/30 border border-white/40 flex flex-col gap-2">
              <Lock className="w-5 h-5 text-brand-primary" />
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">E2E Encryption</p>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Messages are encrypted on your device and can only be read by the recipient.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/30 border border-white/40 flex flex-col gap-2">
              <Key className="w-5 h-5 text-brand-primary" />
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">P2P Verification</p>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Verify session keys out-of-band to ensure zero middleman interception.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/30 border border-white/40 flex flex-col gap-2">
              <Shield className="w-5 h-5 text-brand-primary" />
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Device Lock</p>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Each cryptographic identity is linked directly to your physical browser storage.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
