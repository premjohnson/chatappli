import { useState, useRef } from "react"
import { useSendMessage } from "../hooks/useSendMessage"
import { useAuthStore } from "../../../store/auth.store"
import { encryptMessage } from "../../../utils/crypto"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import { emitTypingStart, emitTypingStop } from "../../../lib/socket"
import { Send, Paperclip, Smile, PlusCircle } from "lucide-react"
import { Button } from "../../../components/ui/Button"
import { motion } from "framer-motion"
import { CreateLiveBlockModal } from "../../chat/components/CreateLiveBlockModal"
import { getUserDevices } from "../../device/device.service"
import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"
import { getParticipantUserId, isParticipantCurrentUser } from "../../conversation/types/conversation.types"
import type { Device } from "../../device/types/device.types"
import type { EncryptedPayload } from "../types/message.types"

interface Props {
  conversationId: string
}

export function MessageInput({ conversationId }: Props) {
  const [text, setText] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { mutateAsync } = useSendMessage()
  const { data: conversations } = useMyConversations()
  const currentUser = useAuthStore((s) => s.user)

  const currentConvo = conversations?.find((c: Conversation) => c._id === conversationId)

  const myParticipant = currentConvo?.participants.find(
    (p: ConversationParticipant) => isParticipantCurrentUser(p, currentUser?.id)
  )
  const isOnlyAdminsCanSend = currentConvo?.groupSettings?.onlyAdminsCanSend ?? false
  const isRequesterAdminOrOwner = myParticipant && ["owner", "admin"].includes(myParticipant.role)
  const cannotSend = currentConvo?.type === "group" && isOnlyAdminsCanSend && !isRequesterAdminOrOwner

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTyping = (value: string) => {
    setText(value)
    emitTypingStart(conversationId)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(conversationId)
    }, 2000)
  }

  const sendEncryptedMessage = async (messageText: string) => {
    const { identityPrivateKey, deviceId: senderDeviceId } = useAuthStore.getState()
    if (!identityPrivateKey || !senderDeviceId) {
      console.warn("Keys or deviceId missing on sender side")
      return
    }

    const currentConvo = conversations?.find((c: Conversation) => c._id === conversationId)
    if (!currentConvo) {
      console.warn("Conversation not found")
      return
    }

    const receiver = currentConvo.participants.find(
      (p: ConversationParticipant) => !isParticipantCurrentUser(p, currentUser?.id)
    )
    const receiverUserId = getParticipantUserId(receiver)
    if (!receiverUserId) {
      console.warn("Receiver user ID not found")
      return
    }

    const senderUserId = currentUser?.id
    if (!senderUserId) {
      console.warn("Sender user ID not found")
      return
    }

    let receiverDevices: Device[] = []
    let senderDevices: Device[] = []

    try {
      const [receiverAllDevices, senderAllDevices] = await Promise.all([
        getUserDevices(receiverUserId),
        getUserDevices(senderUserId)
      ])

      receiverDevices = receiverAllDevices.filter(d => d.isActive)
      senderDevices = senderAllDevices.filter(d => d.isActive)
    } catch (error) {
      console.error("Failed to fetch active devices:", error)
      return
    }

    if (receiverDevices.length === 0) {
      console.warn("Receiver has no active devices")
      return
    }

    const payload = { text: messageText.trim(), file: null }

    try {
      const devicesById = new Map<string, { userId: string; device: Device }>()

      receiverDevices.forEach((device) => {
        devicesById.set(device.deviceId, {
          userId: receiverUserId,
          device
        })
      })

      senderDevices.forEach((device) => {
        if (!devicesById.has(device.deviceId)) {
          devicesById.set(device.deviceId, {
            userId: senderUserId,
            device
          })
        }
      })

      const encryptedPayloads: EncryptedPayload[] = Array.from(devicesById.values()).map(
        ({ userId, device }) => {
          const { encryptedContent, nonce } = encryptMessage(
            JSON.stringify(payload),
            identityPrivateKey,
            device.publicKey
          )

          return {
            recipientUser: userId,
            recipientDeviceId: device.deviceId,
            encryptedContent,
            nonce
          }
        }
      )

      if (
        encryptedPayloads.length === 0 ||
        encryptedPayloads.some(
          (encryptedPayload) =>
            !encryptedPayload.recipientUser ||
            !encryptedPayload.recipientDeviceId ||
            !encryptedPayload.encryptedContent ||
            !encryptedPayload.nonce
        )
      ) {
        console.warn("Invalid encrypted payloads generated")
        return
      }

      await mutateAsync({
        conversationId,
        encryptedPayloads,
        clientMessageId: crypto.randomUUID(),
        senderDeviceId,
        signature: ""
      })

    } catch (error) {
      console.error("Failed to send message:", error)
    }
  };

  const send = async () => {
    if (!text.trim()) return
    emitTypingStop(conversationId)
    await sendEncryptedMessage(text)
    setText("")
  }

  const handleCreateLiveBlockSuccess = async (blockId: string) => {
    await sendEncryptedMessage(`[liveblock:${blockId}]`)
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
        {cannotSend ? (
          <div className="flex-1 text-center py-3 text-xs text-gray-400 font-bold uppercase tracking-widest select-none">
            🔒 Only admins can send messages to this group
          </div>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsModalOpen(true)}
              className="rounded-full shrink-0"
              title="Create collaborative checklist/poll"
            >
              <PlusCircle className="h-5 w-5 text-gray-400 hover:text-brand-primary transition-colors" />
            </Button>

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
          </>
        )}
      </div>

      <CreateLiveBlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        conversationId={conversationId}
        onCreateSuccess={handleCreateLiveBlockSuccess}
      />
    </motion.div>
  )
}
