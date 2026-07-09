import type { Conversation, ConversationParticipant } from "../types/conversation.types"
import { getParticipantUserId, isParticipantCurrentUser } from "../types/conversation.types"
import { formatDate } from "../../../utils/formatDate"
import { useChatStore } from "../../../store/chat.store"
import { useAuthStore } from "../../../store/auth.store"
import { decryptMessage } from "../../../utils/crypto"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getUserDevices } from "../../device/device.service"
import { motion } from "framer-motion"
import { cn } from "../../../utils/cn"
import type { Message } from "../../message/types/message.types"

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
    const latestMessage = useChatStore(
      (s) => s.latestMessages[conversation._id]
    )
  const currentUser = useAuthStore((s) => s.user)
  const identityPrivateKey = useAuthStore((s) => s.identityPrivateKey)
  const currentDeviceId = useAuthStore((s) => s.deviceId)

  const receiver = conversation.type === "private"
    ? conversation.participants.find((p: ConversationParticipant) => !isParticipantCurrentUser(p, currentUser?.id))
    : null

  const receiverId = getParticipantUserId(receiver)
  const isTyping = useChatStore(
    (s) => (s.typingMap[conversation._id] ?? []).includes(receiverId)
  )

  const isOnline = useChatStore(
    (s) => receiverId ? !!s.presenceMap[receiverId] : false
  )

  const myParticipantData = conversation.participants.find((p) => isParticipantCurrentUser(p, currentUser?.id))
  const unreadCount = myParticipantData?.unreadCount || 0

  const { data: receiverDevices } = useQuery({
    queryKey: ["devices", "user", receiverId],
    queryFn: () => getUserDevices(receiverId),
    enabled: Boolean(receiverId)
  })

  const { data: senderDevices } = useQuery({
    queryKey: ["devices", "user", currentUser?.id],
    queryFn: () => currentUser?.id ? getUserDevices(currentUser.id) : Promise.resolve([]),
    enabled: Boolean(currentUser?.id)
  })

  const receiverPublicKey = receiverDevices?.[0]?.publicKey || ""

  const displayText = useMemo(() => {
    let text = "Click to view messages..."
    const latestMsg =
        latestMessage ||
        (
          conversation.lastMessage &&
          typeof conversation.lastMessage === "object" &&
          "_id" in conversation.lastMessage
            ? conversation.lastMessage
            : null
        )
    if (!latestMsg) return text

    try {
      const latestMsgAny = latestMsg as Message
      const encryptedPayload = currentDeviceId
        ? latestMsgAny.encryptedPayloads?.find(
            (payload: any) => payload.recipientDeviceId === currentDeviceId
          )
        : undefined
      let encryptedContent = latestMsgAny.encryptedContent || ""
      let nonce = latestMsgAny.nonce || ""

      if (latestMsgAny.encryptedPayloads?.length) {
        if (!encryptedPayload) return "Encrypted Message"
        encryptedContent = encryptedPayload.encryptedContent
        nonce = encryptedPayload.nonce
      }

      const isSent = latestMsgAny.sender === currentUser?.id
      let senderPublicKey = receiverPublicKey

      if (latestMsgAny.senderDeviceId) {
        const senderDevice = isSent
          ? senderDevices?.find((device) => device.deviceId === latestMsgAny.senderDeviceId)
          : receiverDevices?.find((device) => device.deviceId === latestMsgAny.senderDeviceId)

        if (!senderDevice) return "Encrypted Message"
        senderPublicKey = senderDevice.publicKey
      }

      const raw = decryptMessage(
        encryptedContent,
        nonce,
        senderPublicKey,
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
  },[
  latestMessage,
  conversation.lastMessage,
  currentUser?.id,
  currentDeviceId,
  identityPrivateKey,
  receiverPublicKey,
  receiverDevices,
  senderDevices
])

  const displayName = (conversation.type === "group" ? conversation.groupName || "Group Chat" : receiver?.username || (receiver?.user as any)?.username || "Private Participant") as string

  return (
    <motion.div
      whileHover={{ scale: 1.005, y: -0.5 }}
      whileTap={{ scale: 0.99, y: 0 }}
      onClick={() => onSelect?.(conversation._id)}
      className={cn(
        "flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden group mb-1 border",
        isActive 
          ? "bg-white/80 border-white shadow-md shadow-black/5" 
          : "bg-transparent border-transparent hover:bg-white/30"
      )}
    >
      {isActive && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary" 
        />
      )}

      {/* Avatar Container */}
      <div className="relative shrink-0 select-none">
        <div className="w-11 h-11 rounded-xl bg-brand-primary/10 flex items-center justify-center overflow-hidden border border-brand-primary/20 shadow-inner">
          {conversation.type === "group" && conversation.groupAvatar?.url ? (
            <img src={conversation.groupAvatar.url} className="w-full h-full object-cover" alt={displayName} />
          ) : receiver?.user?.avatar ? (
            <img src={receiver.user.avatar as string} className="w-full h-full object-cover" alt={displayName} />
          ) : (
            <span className="font-bold text-brand-primary text-lg">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {conversation.type !== "group" && isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex justify-between items-baseline mb-0.5 select-none">
          <span className="font-bold text-gray-900 truncate tracking-tight text-[14px]">
            {displayName}
          </span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight shrink-0 ml-2">
            {formatDate(conversation.updatedAt)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className={cn(
            "truncate text-[13px] font-medium leading-normal",
            isTyping ? "text-brand-primary animate-pulse font-semibold" : "text-gray-500"
          )}>
            {isTyping ? "Typing..." : displayName === "Private Participant" ? "Click to verify crypto session" : displayText}
          </span>

          {unreadCount > 0 && (
            <div className="min-w-[18px] h-[18px] px-1 bg-brand-primary text-white rounded-lg flex items-center justify-center text-[9px] font-black shadow-sm shadow-brand-primary/20 flex-shrink-0 select-none">
              {unreadCount}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
