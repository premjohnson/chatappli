import { memo, useMemo } from "react"
import { decryptMessage } from "../../../utils/crypto"
import type { Message } from "../types/message.types"
import { motion } from "framer-motion"
import { cn } from "../../../utils/cn"

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
    if (!msg.encryptedContent) return ""
    if (!identityPrivateKey) return "[Encrypted message]"
    try {
      const text = decryptMessage(
        msg.encryptedContent,
        msg.nonce,
        isSent
          ? receiverPublicKey
          : msg.senderPublicKey || receiverPublicKey,
        identityPrivateKey
      )
      return text || "[Encrypted message]"
    } catch {
      return "[Encrypted message]"
    }
  }, [msg.encryptedContent, msg.nonce, identityPrivateKey, receiverPublicKey, isSent])

  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn("flex w-full mb-4", isSent ? "justify-end" : "justify-start")}
    >
      <div className={cn(
        "max-w-[75%] md:max-w-[60%] px-5 py-3 rounded-3xl shadow-sm relative group",
        isSent 
          ? "bg-brand-primary text-white rounded-br-lg" 
          : "bg-white border border-brand-accent/20 text-gray-800 rounded-bl-lg"
      )}>
        <p className="text-[15px] leading-relaxed font-medium">
          {decryptedText}
        </p>
        
        <div className={cn(
          "flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-70 transition-opacity duration-200",
          isSent ? "justify-end" : "justify-start"
        )}>
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {time}
          </span>
        </div>
      </div>
    </motion.div>
  )
})

MessageBubble.displayName = "MessageBubble"

export default MessageBubble
