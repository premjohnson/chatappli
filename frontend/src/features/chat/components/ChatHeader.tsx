import { useChatStore } from "../../../store/chat.store"
import { useAuthStore } from "../../../store/auth.store"
import { useMemo } from "react"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"
import { getParticipantUserId, isParticipantCurrentUser } from "../../conversation/types/conversation.types"
import { motion } from "framer-motion"
import { Info, ChevronLeft, Search } from "lucide-react"
import { Button } from "../../../components/ui/Button"

interface ChatHeaderProps {
  conversationId: string
  onOpenUserInfo: () => void
  onToggleSearch?: () => void
}

export function ChatHeader({ conversationId, onOpenUserInfo, onToggleSearch,}: ChatHeaderProps) {
  const presenceMap = useChatStore((s) => s.presenceMap)
  const typingMap = useChatStore((s) => s.typingMap)
  const currentUser = useAuthStore((s) => s.user)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const { data: conversations } = useMyConversations()

  const currentConvo = conversations?.find((c: Conversation) => c._id === conversationId) as Conversation | undefined
  const receiver = currentConvo?.participants.find((p: ConversationParticipant) => !isParticipantCurrentUser(p, currentUser?.id))
  const receiverId = getParticipantUserId(receiver)
  const isOnline = presenceMap[receiverId] || false

  // For groups, check all other typing users; for DMs, check only the receiver
  const typingUserIds = typingMap[conversationId || ""] || []
  const otherTypingUserIds = typingUserIds.filter(id => id !== currentUser?.id)
  const isTyping = otherTypingUserIds.length > 0

  const typingText = useMemo(() => {
    if (!isTyping || !currentConvo) return ""
    if (currentConvo.type === "private") {
      return "is typing..."
    }
    const typingUsernames = otherTypingUserIds
      .map(id => {
        const participant = currentConvo.participants.find(p => {
          const pId = (p.user as any)?._id || p.user
          return pId.toString() === id
        })
        return (participant?.user as any)?.username || participant?.username || ""
      })
      .filter(Boolean)

    if (typingUsernames.length === 0) return "Someone is typing..."
    if (typingUsernames.length === 1) return `${typingUsernames[0]} is typing...`
    if (typingUsernames.length === 2) return `${typingUsernames[0]} and ${typingUsernames[1]} are typing...`
    return `${typingUsernames[0]} and ${typingUsernames.length - 1} others are typing...`
  }, [isTyping, otherTypingUserIds, currentConvo])

  const displayName = currentConvo?.type === "group" ? currentConvo?.groupName || "Group Chat" : receiver?.username || (receiver?.user as any)?.username || "Unknown User"
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
          {currentConvo?.type === "group" && currentConvo.groupAvatar?.url ? (
            <img src={currentConvo.groupAvatar.url} alt={displayName} className="w-full h-full object-cover" />
          ) : receiver?.avatar || (receiver?.user as any)?.avatar ? (
            <img src={receiver?.avatar || (receiver?.user as any)?.avatar} alt={displayName} className="w-full h-full object-cover" />
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
              <span>{typingText}</span>
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
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleSearch}
          className="rounded-2xl hover:bg-brand-primary/5 text-gray-400 hover:text-brand-primary transition-colors h-10 w-10 shrink-0"
          title="Search messages"
        >
          <Search className="h-5 w-5" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onOpenUserInfo}
          className="rounded-2xl hover:bg-brand-primary/5 text-gray-400 hover:text-brand-primary transition-colors h-10 w-10 shrink-0"
          title="Chat info"
        >
          <Info className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
