import { useChatStore } from "../../../store/chat.store"
import { useAuthStore } from "../../../store/auth.store"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"

interface ChatHeaderProps {
  conversationId: string
  onOpenUserInfo: () => void
}

export default function ChatHeader({ conversationId, onOpenUserInfo }: ChatHeaderProps) {
  // ✅ Use single selector to prevent multiple re-renders
  const presenceMap = useChatStore((s) => s.presenceMap)
  const typingMap = useChatStore((s) => s.typingMap)

  const currentUser = useAuthStore((s) => s.user)
  const { data: conversations } = useMyConversations()

  // Find current conversation and receiver
  const currentConvo = conversations?.find(
    (c: Conversation) => c._id === conversationId
  ) as Conversation | undefined

  const receiver = currentConvo?.participants.find(
    (p: ConversationParticipant) => p._id !== currentUser?.id
  )

  const receiverId = receiver?._id || ""
  const isOnline = presenceMap[receiverId] || false
  const isTyping = typingMap[conversationId || ""]?.includes(receiverId) || false

  // Determine display name
  const displayName = currentConvo?.type === "group"
    ? currentConvo?.groupName || "Group Chat"
    : receiver?.username || "Unknown User"

  // Determine avatar (first letter or image)
  const avatar = receiver?.avatar

  const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : "?"

  // Status message
  const statusMessage = isTyping
    ? "typing..."
    : isOnline
      ? "Online"
      : "Offline"

  const statusColor = isTyping ? "text-blue-500 font-medium" : isOnline ? "text-emerald-500" : "text-gray-400"

  return (
    <div
      onClick={onOpenUserInfo}
      className="flex items-center gap-4 p-4 md:px-6 md:py-4 border-b border-gray-100 bg-white/50 backdrop-blur-md cursor-pointer hover:bg-white/70 transition-colors"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          displayInitial
        )}
      </div>

      {/* Name and Status */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-semibold text-gray-800 tracking-tight truncate">
          {displayName}
        </span>
        <span className={`text-xs mt-0.5 tracking-wide flex items-center gap-1 ${statusColor}`}>
          {isTyping ? (
            <>
              <span>typing</span>
              <span className="flex gap-[2px] mt-1.5 ml-0.5">
                <span
                  className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
            </>
          ) : (
            <>
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
              {statusMessage}
            </>
          )}
        </span>
      </div>

      {/* Click hint */}
      <div className="text-gray-400 text-lg">📋</div>
    </div>
  )
}
