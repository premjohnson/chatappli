import { useState, useRef } from "react"
import { useSendMessage } from "../hooks/useSendMessage"
import { useAuthStore } from "../../../store/auth.store"
import { encryptMessage } from "../../../utils/crypto"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import { emitTypingStart, emitTypingStop } from "../../../lib/socket"

import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"

interface Props {
  conversationId: string
}

export default function MessageInput({ conversationId }: Props) {

  const [text, setText] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { mutateAsync } = useSendMessage()
  const { data: conversations } = useMyConversations()
  const currentUser = useAuthStore((s) => s.user)

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleTyping = (value: string) => {
    setText(value)

    emitTypingStart(conversationId)

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(conversationId)
    }, 2000)
  }

  const send = async () => {

    if (!text.trim() && !selectedFile) return

    const { identityPrivateKey } = useAuthStore.getState()

    if (!identityPrivateKey) {
      console.error("Missing identity private key")
      return
    }

    emitTypingStop(conversationId)

    const currentConvo = conversations?.find(
      (c: Conversation) => c._id === conversationId
    )

    if (!currentConvo) return

    const receiver = currentConvo.participants.find(
      (p: ConversationParticipant) => p._id !== currentUser?.id
    )

    const receiverPublicKey =
      receiver?.publicKey || receiver?.user?.publicKey

    if (!receiverPublicKey) {
      console.error("Receiver public key missing")
      return
    }

    const payload = {
      text: text.trim(),
      file: null
    }

    try {

      const { encryptedContent, nonce } = encryptMessage(
        JSON.stringify(payload),
        identityPrivateKey,
        receiverPublicKey
      )

      await mutateAsync({
        conversationId,
        encryptedContent,
        nonce,
        clientMessageId: crypto.randomUUID(),
        type: "text"
      })

      setText("")
      setSelectedFile(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }

  }

  return (
    <div className="p-4 flex gap-3 items-center">

      <input
        value={text}
        onChange={(e) => handleTyping(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-1 rounded-full px-5 py-3 bg-white shadow-inner border border-gray-100 focus:outline-none"
      />

      <button
        onClick={send}
        disabled={!text.trim()}
        className="w-12 h-12 rounded-full bg-blue-500 text-white"
      >
        ➤
      </button>

    </div>
  )
}