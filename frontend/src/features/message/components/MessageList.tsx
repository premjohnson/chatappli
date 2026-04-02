import { useAuthStore } from "../../../store/auth.store"
import { useMessages } from "../hooks/useMessages"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import MessageBubble from "./MessageBubble"

import { useMemo, useRef, useEffect } from "react"

interface Props {
  conversationId: string
}

export default function MessageList({ conversationId }: Props) {

  const { data } = useMessages(conversationId)
  const { data: conversations } = useMyConversations()

  const currentUser = useAuthStore((s) => s.user)
  const identityPrivateKey = useAuthStore((s) => s.identityPrivateKey)

  const bottomRef = useRef<HTMLDivElement>(null)

  const messages = useMemo(() => {

    if (!data?.pages) return []

    return data.pages.flat().reverse()

  }, [data])

  const currentConvo = conversations?.find(
    (c) => c._id === conversationId
  )

  const receiver = currentConvo?.participants.find(
    (p) => p.user?.id !== currentUser?.id
  )

  const receiverPublicKey = receiver?.user?.publicKey || ""

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col gap-4 p-6 overflow-y-auto h-full">

      {messages.map((msg) => {

        const senderId =
          typeof msg.sender === "string"
            ? msg.sender
            : msg.sender?._id

        const isSent = senderId === currentUser?.id

        return (
          <MessageBubble
            key={msg._id}
            msg={msg}
            identityPrivateKey={identityPrivateKey}
            isSent={isSent}
            receiverPublicKey={receiverPublicKey}
          />
        )

      })}

      <div ref={bottomRef} />

    </div>
  )
}