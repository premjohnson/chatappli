import { useChatStore } from "../../../store/chat.store"
import { useAuthStore } from "../../../store/auth.store"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"
import { motion } from "framer-motion"
import { Info, ChevronLeft } from "lucide-react"
import { Button } from "../../../components/ui/Button"

interface ChatHeaderProps {
  conversationId: string
  onOpenUserInfo: () => void
}

export function ChatHeader({ conversationId, onOpenUserInfo }: ChatHeaderProps) {
  const presenceMap = useChatStore((s) => s.presenceMap)
  const typingMap = useChatStore((s) => s.typingMap)
  const currentUser = useAuthStore((s) => s.user)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const { data: conversations } = useMyConversations()

  const currentConvo = conversations?.find((c: Conversation) => c._id === conversationId) as Conversation | undefined
  const receiver = currentConvo?.participants.find((p: ConversationParticipant) => p._id !== currentUser?.id)
  const receiverId = receiver?._id || ""
  const isOnline = presenceMap[receiverId] || false
  const isTyping = typingMap[conversationId || ""]?.includes(receiverId) || false

  const displayName = currentConvo?.type === "group" ? currentConvo?.groupName || "Group Chat" : receiver?.username || "Unknown User"
  const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : "?"

  return (
    <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 border-b border-white/10 bg-white/40 backdrop-blur-xl relative z-10 select-none">
      {/* Back Button for mobile viewports */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setActiveConversation(null)}
        className="md:hidden rounded-full h-8 w-8 text-gray-500 hover:bg-gray-100/50 shrink-0"
        title="Back to conversation list"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* Avatar Container */}
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold shadow-inner overflow-hidden border border-brand-primary/20">
          {receiver?.avatar ? (
            <img src={receiver.avatar} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">{displayInitial}</span>
          )}
        </div>
        {currentConvo?.type !== "group" && isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse" />
        )}
      </div>

      {/* Name and Status */}
      <div className="flex flex-col flex-1 min-w-0">
        <h2 className="font-bold text-gray-900 tracking-tight truncate text-[16px]">
          {displayName}
        </h2>
        <div className="flex items-center gap-2 mt-0.5">
          {isTyping ? (
            <div className="flex items-center gap-1.5 text-brand-primary font-semibold text-[11px] animate-pulse">
              <span className="flex gap-[3px]">
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-current rounded-full" />
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-current rounded-full" />
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-current rounded-full" />
              </span>
              <span>is typing...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {currentConvo?.type !== "group" && (
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
              )}
              <span className={`text-[11px] font-bold ${isOnline ? "text-emerald-500" : "text-gray-400 uppercase tracking-wider"}`}>
                {currentConvo?.type === "group" ? `${currentConvo.participants.length} members` : isOnline ? "Active Now" : "Offline"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onOpenUserInfo}
        className="rounded-2xl hover:bg-brand-primary/5 text-gray-400 hover:text-brand-primary transition-colors h-10 w-10 shrink-0"
      >
        <Info className="h-5 w-5" />
      </Button>
    </div>
  )
}
