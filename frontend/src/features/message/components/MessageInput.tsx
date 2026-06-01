import { useState, useRef } from "react"
import { useSendMessage } from "../hooks/useSendMessage"
import { useAuthStore } from "../../../store/auth.store"
import { encryptMessage } from "../../../utils/crypto"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import { emitTypingStart, emitTypingStop } from "../../../lib/socket"
import { Send, Paperclip, Smile } from "lucide-react"
import { Button } from "../../../components/ui/Button"
import { motion } from "framer-motion"

import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"

interface Props {
  conversationId: string
}

export function MessageInput({ conversationId }: Props) {
  const [text, setText] = useState("")
  const { mutateAsync } = useSendMessage()
  const { data: conversations } = useMyConversations()
  const currentUser = useAuthStore((s) => s.user)

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTyping = (value: string) => {
    setText(value)
    emitTypingStart(conversationId)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(conversationId)
    }, 2000)
  }

  const send = async () => {
    if (!text.trim()) return
    const { identityPrivateKey } = useAuthStore.getState()
    if (!identityPrivateKey) return

    emitTypingStop(conversationId)
    const currentConvo = conversations?.find((c: Conversation) => c._id === conversationId)
    if (!currentConvo) return

    const receiver = currentConvo.participants.find((p: ConversationParticipant) => p._id !== currentUser?.id)
    const receiverPublicKey = receiver?.publicKey || receiver?.user?.publicKey
    if (!receiverPublicKey) return

    const payload = { text: text.trim(), file: null }

    try {
      const { encryptedContent, nonce } = encryptMessage(JSON.stringify(payload), identityPrivateKey, receiverPublicKey)
      await mutateAsync({
        conversationId,
        encryptedContent,
        nonce,
        clientMessageId: crypto.randomUUID(),
        type: "text"
      })
      setText("")
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
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="p-4 md:p-6 pt-2"
    >
      <div className="glass-floating rounded-3xl p-2 flex gap-2 items-center shadow-xl border-white/40">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0 hidden sm:flex">
          <Paperclip className="h-5 w-5 text-gray-400" />
        </Button>
        
        <input
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 placeholder:text-gray-400 py-3 px-2 text-[15px]"
        />

        <div className="flex items-center gap-1 pr-1">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0 hidden sm:flex">
            <Smile className="h-5 w-5 text-gray-400" />
          </Button>
          
          <Button 
            onClick={send} 
            disabled={!text.trim()}
            size="icon"
            className="rounded-full h-10 w-10 bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md transition-all active:scale-95"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
