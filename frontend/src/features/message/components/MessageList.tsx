import { useAuthStore } from "../../../store/auth.store"
import { useMessages } from "../hooks/useMessages"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import { getParticipantUserId, isParticipantCurrentUser } from "../../conversation/types/conversation.types"
import MessageBubble from "./MessageBubble"
import { getUserDevices } from "../../device/device.service"
import { useQuery } from "@tanstack/react-query"

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

    // Since query pages are newest-page-first in the array (e.g. pages[0] has latest page of messages),
    // and messages inside each page are in ascending order (oldest first), we reverse the pages array itself
    // first and then flatten it to get all messages in chronological order (oldest-to-newest).
    return [...data.pages].reverse().flat()

  }, [data])

  const currentConvo = conversations?.find(
    (c) => c._id === conversationId
  )

  const receiver = currentConvo?.participants.find(
    (p) => !isParticipantCurrentUser(p, currentUser?.id)
  )

  const receiverUserId = getParticipantUserId(receiver)

  // Fetch receiver active devices
  const { data: receiverDevices } = useQuery({
    queryKey: ["devices", "user", receiverUserId],
    queryFn: () => getUserDevices(receiverUserId),
    enabled: Boolean(receiverUserId)
  })

  const { data: senderDevices } = useQuery({
    queryKey: ["devices", "user", currentUser?.id],
    queryFn: () => currentUser?.id ? getUserDevices(currentUser.id) : Promise.resolve([]),
    enabled: Boolean(currentUser?.id)
  })

  const receiverDevicesSorted = useMemo(() => {
    if (!receiverDevices) return []
    return [...receiverDevices].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [receiverDevices])

  const receiverPublicKey = receiverDevicesSorted[0]?.publicKey || ""

  const senderDevicesSorted = useMemo(() => {
    if (!senderDevices) return []
    return [...senderDevices].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [senderDevices])

  console.log("Render MessageList", {
    conversationId,
    messageIds: messages.map((msg) => ({
      id: msg._id,
      clientMessageId: msg.clientMessageId,
      senderDeviceId: msg.senderDeviceId,
      encryptedPayloadDeviceIds: msg.encryptedPayloads?.map((payload) => payload.recipientDeviceId)
    })),
    currentUserId: currentUser?.id,
    identityPrivateKeyLoaded: Boolean(identityPrivateKey),
    receiverUserId,
    receiverPublicKeyLoaded: Boolean(receiverPublicKey),
    receiverDeviceIds: receiverDevicesSorted.map((device) => device.deviceId),
    senderDeviceIds: senderDevicesSorted.map((device) => device.deviceId)
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col gap-3.5 p-5 overflow-y-auto h-full custom-scrollbar">

      {messages.map((msg) => {

        return (
          <MessageBubble
            key={msg._id}
            msg={msg}
            identityPrivateKey={identityPrivateKey}
            receiverPublicKey={receiverPublicKey}
            receiverDevices={receiverDevicesSorted}
            senderDevices={senderDevicesSorted}
          />
        )

      })}

      <div ref={bottomRef} />

    </div>
  )
}
