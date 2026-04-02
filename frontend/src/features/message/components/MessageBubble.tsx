import { memo, useMemo } from "react"
import { decryptMessage } from "../../../utils/crypto"
import type { Message } from "../types/message.types"

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

  }, [
    msg.encryptedContent,
    msg.nonce,
    identityPrivateKey,
    receiverPublicKey,
    isSent
  ])

  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"}`}>

      <div
        className={`max-w-xs px-4 py-2 rounded-xl ${
          isSent
            ? "bg-emerald-500 text-white"
            : "bg-white border"
        }`}
      >

        <p className="text-sm">{decryptedText}</p>

        <span className="text-xs opacity-70">
          {time}
        </span>

      </div>

    </div>
  )

})

MessageBubble.displayName = "MessageBubble"

export default MessageBubble