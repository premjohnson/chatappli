import type { Conversation, ConversationParticipant } from "../types/conversation.types"
import { formatDate } from "../../../utils/formatDate"
import { useChatStore } from "../../../store/chat.store"
import { useAuthStore } from "../../../store/auth.store"
import { decryptMessage } from "../../../utils/crypto"
import { useMemo } from "react"
import { motion } from "framer-motion"
import { cn } from "../../../utils/cn"

type Props = {
  conversation: Conversation
  isActive?: boolean
  onSelect?: (conversationId: string) => void
}

export default function ConversationItem({
  conversation,
  isActive,
  onSelect
}: Props) {
  const typingMap = useChatStore((s) => s.typingMap)
  const latestMessages = useChatStore((s) => s.latestMessages)
  const currentUser = useAuthStore((s) => s.user)
  const identityPrivateKey = useAuthStore((s) => s.identityPrivateKey)

  const receiver = conversation.type === "private"
    ? conversation.participants.find((p: ConversationParticipant) => p.user?.id !== currentUser?.id)
    : null

  const receiverId = receiver?.user?.id || ""
  const isTyping = typingMap?.[conversation._id]?.includes(receiverId) || false

  const myParticipantData = conversation.participants.find((p) => p.user?.id === currentUser?.id)
  const unreadCount = myParticipantData?.unreadCount || 0

  const displayText = useMemo(() => {
    let text = "Click to view messages..."
    const latestMsg = latestMessages?.[conversation._id] || (conversation.lastMessage && typeof conversation.lastMessage === "object" && "_id" in conversation.lastMessage ? conversation.lastMessage : null)
    if (!latestMsg) return text

    try {
      const senderId = typeof latestMsg.sender === "string" ? latestMsg.sender : latestMsg.sender?._id
      const isSent = senderId === currentUser?.id
      const raw = decryptMessage(
        latestMsg.encryptedContent,
        latestMsg.nonce,
        isSent ? receiver?.user?.publicKey || "" : latestMsg.senderPublicKey || receiver?.user?.publicKey || "",
        identityPrivateKey || ""
      )
      if (!raw) return "Encrypted Message"
      try {
        const parsed = JSON.parse(raw)
        if (parsed.text) text = parsed.text
        else if (parsed.file) text = `📎 ${parsed.file.name}`
        else text = "New Message"
      } catch { text = raw }
    } catch { text = "Encrypted Message" }
    return text
  }, [latestMessages?.[conversation._id]?._id, (conversation.lastMessage as any)?._id, currentUser?.id, identityPrivateKey, receiver?.user?.publicKey, conversation._id])

  const displayName = conversation.type === "group" ? conversation.groupName || "Group Chat" : receiver?.user?.username || "Private Participant"

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect?.(conversation._id)}
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden group mb-1",
        isActive 
          ? "bg-white shadow-lg shadow-brand-primary/5 ring-1 ring-white" 
          : "hover:bg-white/40"
      )}
    >
      {isActive && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary" 
        />
      )}

      {/* Avatar */}
      <div className="w-14 h-14 rounded-2xl bg-brand-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-brand-primary/10">
        {conversation.type === "group" && conversation.groupAvatar?.url ? (
          <img src={conversation.groupAvatar.url} className="w-full h-full object-cover" alt={displayName} />
        ) : receiver?.user?.avatar ? (
          <img src={receiver.user.avatar} className="w-full h-full object-cover" alt={displayName} />
        ) : (
          <span className="font-bold text-brand-primary text-xl">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="font-bold text-gray-900 truncate tracking-tight">
            {displayName}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter shrink-0 ml-2">
            {formatDate(conversation.updatedAt)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className={cn(
            "truncate text-sm font-medium",
            isTyping ? "text-brand-primary animate-pulse" : "text-gray-500"
          )}>
            {isTyping ? "Typing..." : displayText}
          </span>

          {unreadCount > 0 && (
            <div className="min-w-[20px] h-5 px-1.5 bg-brand-primary text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm shadow-brand-primary/20">
              {unreadCount}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
