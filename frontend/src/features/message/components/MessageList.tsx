import { useAuthStore } from "../../../store/auth.store"
import { useMessages } from "../hooks/useMessages"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import { getParticipantUserId, isParticipantCurrentUser } from "../../conversation/types/conversation.types"
import MessageBubble from "./MessageBubble"
import { getUserDevices, getUsersDevices } from "../../device/device.service"
import { useQuery } from "@tanstack/react-query"
import { decryptedCache } from "../../../utils/decryptedCache"

import { useMemo, useRef, useEffect } from "react"
import type { Device } from "../../device/types/device.types"
import type { Message } from "../types/message.types"

const EMPTY_DEVICES: Device[] = []

interface Props {
  conversationId: string
  searchQuery?: string
}

export default function MessageList({ conversationId, searchQuery }: Props) {

  const { data } = useMessages(conversationId)
  const { data: conversations } = useMyConversations()

  const currentUser = useAuthStore((s) => s.user)
  const identityPrivateKey = useAuthStore((s) => s.identityPrivateKey)

  const bottomRef = useRef<HTMLDivElement>(null)


  const messages = useMemo(() => {
    if (!data?.pages) {
      return []
    }

    const all = [...data.pages]
      .reverse()
      .flatMap(page => page.data)

    const filtered = searchQuery?.trim()
      ? all.filter((msg) => {
          if (msg.type === "system") {
            return msg.encryptedContent?.toLowerCase().includes(searchQuery.toLowerCase())
          }
          if (msg.fileMeta?.fileName?.toLowerCase().includes(searchQuery.toLowerCase())) {
            return true
          }
          const decrypted = decryptedCache.get(msg._id)
          return decrypted?.toLowerCase().includes(searchQuery.toLowerCase())
        })
      : all

    // Deduplicate by ID and hide if soft-deleted for self
    const seen = new Set<string>()
    const deduped: Message[] = []

    filtered.forEach((msg) => {
      // Hide if soft-deleted for me
      if (msg.deletedFor && msg.deletedFor.some((id: any) => String(id) === String(currentUser?.id))) {
        return
      }

      // A message without a server id is an optimistic message. Promote its
      // client id to _id so React keys and every context-menu action share one
      // stable, unique message id.
      const messageId = msg._id || msg.clientMessageId
      if (!messageId || seen.has(messageId)) return

      seen.add(messageId)
      deduped.push(msg._id ? msg : { ...msg, _id: messageId })
    })

    return deduped
  }, [data, searchQuery, currentUser?.id])

  const currentConvo = conversations?.find(
    (c) => c._id === conversationId
  )

  const receiver = currentConvo?.participants.find(
    (p) => !isParticipantCurrentUser(p, currentUser?.id)
  )

  const receiverUserId = getParticipantUserId(receiver)

  const participantUserIds = useMemo(() => {
    if (!currentConvo) return []
    return currentConvo.participants.map((p) => {
      const u = p.user as any
      return (u?._id || p.user).toString()
    })
  }, [currentConvo])

  // Fetch group devices in bulk
  const { data: groupDevices } = useQuery({
    queryKey: ["devices", "group", conversationId],
    queryFn: () => getUsersDevices(participantUserIds),
    enabled: currentConvo?.type === "group" && participantUserIds.length > 0
  })

  // Fetch receiver active devices (for 1:1)
  const { data: receiverDevices } = useQuery({
    queryKey: ["devices", "user", receiverUserId],
    queryFn: () => getUserDevices(receiverUserId),
    enabled: currentConvo?.type === "private" && Boolean(receiverUserId)
  })

  const { data: senderDevices } = useQuery({
    queryKey: ["devices", "user", currentUser?.id],
    queryFn: () => currentUser?.id ? getUserDevices(currentUser.id) : Promise.resolve([]),
    enabled: currentConvo?.type === "private" && Boolean(currentUser?.id)
  })

  const senderDevicesList = useMemo(() => {
    if (currentConvo?.type === "group") {
      return groupDevices?.filter((d) => d.userId === currentUser?.id) || EMPTY_DEVICES
    }
    return senderDevices || EMPTY_DEVICES
  }, [currentConvo?.type, groupDevices, senderDevices, currentUser?.id])

  const receiverDevicesList = useMemo(() => {
    if (currentConvo?.type === "group") {
      return groupDevices?.filter((d) => d.userId !== currentUser?.id) || EMPTY_DEVICES
    }
    return receiverDevices || EMPTY_DEVICES
  }, [currentConvo?.type, groupDevices, receiverDevices, currentUser?.id])

  const receiverDevicesSorted = useMemo(() => {
    if (!receiverDevicesList) return EMPTY_DEVICES
    return [...receiverDevicesList].sort(
      (a, b) => {
        const timeA = "updatedAt" in a ? new Date((a as any).updatedAt || 0).getTime() : 0
        const timeB = "updatedAt" in b ? new Date((b as any).updatedAt || 0).getTime() : 0
        return timeB - timeA
      }
    )
  }, [receiverDevicesList])

  const receiverPublicKey = currentConvo?.type === "group" ? "" : (receiverDevicesSorted[0]?.publicKey || "")

  const senderDevicesSorted = useMemo(() => {
    if (!senderDevicesList) return EMPTY_DEVICES
    return [...senderDevicesList].sort(
      (a, b) => {
        const timeA = "updatedAt" in a ? new Date((a as any).updatedAt || 0).getTime() : 0
        const timeB = "updatedAt" in b ? new Date((b as any).updatedAt || 0).getTime() : 0
        return timeB - timeA
      }
    )
  }, [senderDevicesList])

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
    <div className="flex flex-col gap-3.5 p-5 overflow-y-auto h-full custom-scrollbar relative">

      {messages.map((msg) => {

        return (
          <MessageBubble
            key={msg.clientMessageId || msg._id}
            msg={msg}
            identityPrivateKey={identityPrivateKey}
            receiverPublicKey={receiverPublicKey}
            receiverDevices={receiverDevicesSorted as any}
            senderDevices={senderDevicesSorted as any}
          />
        )

      })}

      <div ref={bottomRef} />

    </div>
  )
}
