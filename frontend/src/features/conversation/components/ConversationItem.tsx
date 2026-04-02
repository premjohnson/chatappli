import type { Conversation, ConversationParticipant } from "../types/conversation.types"
import { formatDate } from "../../../utils/formatDate"
import { useChatStore } from "../../../store/chat.store"
import { useAuthStore } from "../../../store/auth.store"
import { decryptMessage } from "../../../utils/crypto"
import { useMemo } from "react"

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

  /* ================= RECEIVER DETECTION ================= */

  const receiver = conversation.type === "private"
    ? conversation.participants.find(
        (p: ConversationParticipant) =>
          p.user?.id !== currentUser?.id
      )
    : null

  const receiverId = receiver?.user?.id || ""

  const isTyping =
    typingMap?.[conversation._id]?.includes(receiverId) || false

  /* ================= UNREAD COUNT ================= */

  const myParticipantData = conversation.participants.find(
    (p) => p.user?.id === currentUser?.id
  )

  const unreadCount = myParticipantData?.unreadCount || 0

  const handleClick = () => {
    onSelect?.(conversation._id)
  }

  /* ================= MESSAGE PREVIEW ================= */

  const displayText = useMemo(() => {

    let text = "Click to view messages..."

    const latestMsg = latestMessages?.[conversation._id]

    const msgObj =
      latestMsg ||
      (conversation.lastMessage &&
        typeof conversation.lastMessage === "object" &&
        "_id" in conversation.lastMessage
        ? conversation.lastMessage
        : null)

    if (!msgObj) return text

    try {

      const senderId =
        typeof msgObj.sender === "string"
          ? msgObj.sender
          : msgObj.sender?._id

      const isSent = senderId === currentUser?.id

      const raw = decryptMessage(
        msgObj.encryptedContent,
        msgObj.nonce,
        isSent
          ? receiver?.user?.publicKey || ""
          : msgObj.senderPublicKey || receiver?.user?.publicKey || "",
        identityPrivateKey || ""
      )

      if (!raw) return "Encrypted Message"

      try {

        const parsed = JSON.parse(raw)

        if (parsed.text) text = parsed.text
        else if (parsed.file) text = `📎 ${parsed.file.name}`
        else text = "New Message"

      } catch {
        text = raw
      }

    } catch {
      text = "Encrypted Message"
    }

    return text

  }, [
    latestMessages?.[conversation._id]?._id,
    (conversation.lastMessage as any)?._id,
    currentUser?.id,
    identityPrivateKey,
    receiver?.user?.publicKey,
    conversation._id
  ])

  /* ================= DISPLAY NAME ================= */

  const displayName =
    conversation.type === "group"
      ? conversation.groupName || "Group Chat"
      : receiver?.user?.username || "Private Participant"

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-center gap-3
        p-3 rounded-xl cursor-pointer
        transition-all duration-300
        ${isActive
          ? "bg-white shadow ring-1 ring-white border-l-4 border-l-blue-500"
          : "hover:bg-white/50 border-l-4 border-l-transparent"}
      `}
    >

      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden">

        {conversation.type === "group" && conversation.groupAvatar?.url ? (
          <img
            src={conversation.groupAvatar.url}
            className="w-full h-full object-cover"
          />
        ) : receiver?.user?.avatar ? (
          <img
            src={receiver.user.avatar}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-bold text-gray-500">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}

      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 overflow-hidden">

        <div className="flex justify-between">

          <span className="font-semibold truncate">
            {displayName}
          </span>

          <span className="text-xs text-gray-400">
            {formatDate(conversation.updatedAt)}
          </span>

        </div>

        <div className="flex justify-between">

          <span className={`truncate text-sm ${isTyping ? "text-blue-500 italic" : "text-gray-500"}`}>
            {isTyping ? "typing..." : displayText}
          </span>

          {unreadCount > 0 && (
            <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
              {unreadCount}
            </div>
          )}

        </div>

      </div>
    </div>
  )
}