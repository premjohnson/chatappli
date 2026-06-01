import { useChatStore } from "../../../store/chat.store"
import { useAuthStore } from "../../../store/auth.store"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"
import { motion } from "framer-motion"
import { Info } from "lucide-react"
import { Button } from "../../../components/ui/Button"

interface ChatHeaderProps {
  conversationId: string
  onOpenUserInfo: () => void
}

export function ChatHeader({ conversationId, onOpenUserInfo }: ChatHeaderProps) {
  const presenceMap = useChatStore((s) => s.presenceMap)
  const typingMap = useChatStore((s) => s.typingMap)
  const currentUser = useAuthStore((s) => s.user)
  const { data: conversations } = useMyConversations()

  const currentConvo = conversations?.find((c: Conversation) => c._id === conversationId) as Conversation | undefined
  const receiver = currentConvo?.participants.find((p: ConversationParticipant) => p._id !== currentUser?.id)
  const receiverId = receiver?._id || ""
  const isOnline = presenceMap[receiverId] || false
  const isTyping = typingMap[conversationId || ""]?.includes(receiverId) || false

  const displayName = currentConvo?.type === "group" ? currentConvo?.groupName || "Group Chat" : receiver?.username || "Unknown User"
  const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : "?"

  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-white/10 bg-white/40 backdrop-blur-xl relative z-10">
      {/* Avatar Container */}
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold shadow-inner overflow-hidden border border-brand-primary/20">
          {receiver?.avatar ? (
            <img src={receiver.avatar} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">{displayInitial}</span>
          )}
        </div>
        {isOnline && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
        )}
      </div>

      {/* Name and Status */}
      <div className="flex flex-col flex-1 min-w-0">
        <h2 className="font-bold text-gray-900 tracking-tight truncate text-lg">
          {displayName}
        </h2>
        <div className="flex items-center gap-2">
          {isTyping ? (
            <div className="flex items-center gap-1.5 text-brand-primary font-medium text-xs">
              <span className="flex gap-[3px]">
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-current rounded-full" />
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-current rounded-full" />
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-current rounded-full" />
              </span>
              <span>is typing...</span>
            </div>
          ) : (
            <span className={`text-xs font-semibold tracking-wide ${isOnline ? "text-emerald-500" : "text-gray-400 uppercase"}`}>
              {isOnline ? "Active Now" : "Offline"}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onOpenUserInfo}
        className="rounded-2xl hover:bg-brand-primary/5 text-gray-400 hover:text-brand-primary transition-colors"
      >
        <Info className="h-6 w-6" />
      </Button>
    </div>
  )
}
