import { memo, useMemo } from "react"
import { decryptMessage } from "../../../utils/crypto"
import type { Message } from "../types/message.types"
import { motion } from "framer-motion"
import { cn } from "../../../utils/cn"
import { LiveBlockWidget } from "../../chat/components/LiveBlockWidget"
import { Check, CheckCheck } from "lucide-react"

interface Props {
  msg: Message
  identityPrivateKey: string | null
  isSent: boolean
  receiverPublicKey: string
}

const MessageBubble = memo(({
  msg,
  identityPrivateKey,
  isSent,
  receiverPublicKey
}: Props) => {

  const decryptedText = useMemo(() => {
    if (!msg.encryptedContent || !msg.nonce || !identityPrivateKey) return ""
    try {
      const text = decryptMessage(
        msg.encryptedContent as string,
        msg.nonce as string,
        isSent
          ? receiverPublicKey
          : (msg.senderPublicKey || receiverPublicKey) as string,
        identityPrivateKey as string
      )
      return text || "[Encrypted message]"
    } catch {
      return "[Encrypted message]"
    }
  }, [msg.encryptedContent, msg.nonce, identityPrivateKey, receiverPublicKey, isSent])

  const parsedMessage = useMemo(() => {
    if (!decryptedText) return { text: "", isLiveBlock: false, blockId: "" }
    let text = decryptedText
    try {
      const parsed = JSON.parse(decryptedText)
      text = parsed.text || text
    } catch {
      // Not JSON
    }

    const liveBlockRegex = /\[liveblock:([a-fA-F0-9]{24})\]/
    const match = text.match(liveBlockRegex)
    if (match) {
      return {
        text,
        isLiveBlock: true,
        blockId: match[1]
      }
    }

    return {
      text,
      isLiveBlock: false,
      blockId: ""
    }
  }, [decryptedText])

  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn("flex w-full mb-3", isSent ? "justify-end" : "justify-start")}
    >
      {parsedMessage.isLiveBlock ? (
        <div className="relative group">
          <LiveBlockWidget blockId={parsedMessage.blockId} />
          <div className={cn(
            "flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-70 transition-opacity duration-200 px-1",
            isSent ? "justify-end" : "justify-start"
          )}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {time}
            </span>
          </div>
        </div>
      ) : (
        <div className={cn(
          "max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-2xl relative shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-0.5",
          isSent 
            ? "bg-gradient-to-br from-[#FFAF38] to-[#FF8C00] text-white rounded-tr-none" 
            : "bg-white/90 border border-white/60 text-gray-800 rounded-tl-none backdrop-blur-md"
        )}>
          <p className="text-[14px] leading-relaxed font-medium break-words">
            {parsedMessage.text}
          </p>
          
          {isSent ? (
            <div className="flex items-center justify-end gap-1 select-none opacity-85 text-[9px] font-bold uppercase tracking-wider self-end mt-0.5">
              <span>{time}</span>
              {msg.status === "read" ? (
                <CheckCheck className="w-3.5 h-3.5 text-brand-accent" />
              ) : msg.status === "delivered" ? (
                <CheckCheck className="w-3.5 h-3.5 text-white/70" />
              ) : (
                <Check className="w-3.5 h-3.5 text-white/70" />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-start select-none opacity-60 text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
              <span>{time}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
})

MessageBubble.displayName = "MessageBubble"

export default MessageBubble
