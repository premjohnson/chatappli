  import { memo, useMemo, useRef } from "react"
  import { decryptMessage } from "../../../utils/crypto"
  import type { Message, EncryptedPayload } from "../types/message.types"
  import { motion } from "framer-motion"
  import { cn } from "../../../utils/cn"
  import { LiveBlockWidget } from "../../chat/components/LiveBlockWidget"
  import { Check, CheckCheck, Pin, Star } from "lucide-react"
  import { useAuthStore } from "../../../store/auth.store"
  import type { Device, DeviceInfo } from "../../device/types/device.types"
  import { ImageMessage } from "./media/ImageMessage"
  import { VideoMessage } from "./media/VideoMessage"
  import { AudioMessage } from "./media/AudioMessage"
  import { DocumentMessage } from "./media/DocumentMessage"
  import { useMediaViewerStore } from "../../../store/media.store"
  import { useContextMenuStore } from "../../../store/contextMenu.store"
  import { useQueryClient } from "@tanstack/react-query"

  interface Props {
    msg: Message
    identityPrivateKey: string | null
    receiverPublicKey: string
    receiverDevices?: (Device | DeviceInfo)[]
    senderDevices?: (Device | DeviceInfo)[]
  }

  const MessageBubble = memo(({
    msg,
    identityPrivateKey,
    receiverPublicKey,
    receiverDevices,
    senderDevices
  }: Props) => {
    const currentUser = useAuthStore((s) => s.user)
    const currentDeviceId = useAuthStore((s) => s.deviceId)
    const openViewer = useMediaViewerStore((s) => s.openViewer)

    const { openContextMenu, isSelectionMode, toggleSelectMessage, selectedMessageIds } = useContextMenuStore()
    const longPressTimeout = useRef<any>(null)

    const handleTouchStart = (e: React.TouchEvent) => {
      if (isSelectionMode) return

      const bubbleEl = (e.currentTarget.querySelector(".bubble-card") as HTMLElement) || (e.currentTarget as HTMLElement)

      console.log("[RUNTIME LOG] Long-press/touchstart event triggered", {
        element: bubbleEl,
        messageId: msg._id,
        clientMessageId: msg.clientMessageId,
        reactKey: msg.clientMessageId || msg._id,
        conversationId: msg.conversation
      })

      longPressTimeout.current = setTimeout(() => {
        openContextMenu(msg, bubbleEl)
      }, 600)
    }

    const handleTouchEnd = () => {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current)
      }
    }

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault()
      if (isSelectionMode) return

      const bubbleEl = (e.currentTarget.querySelector(".bubble-card") as HTMLElement) || (e.currentTarget as HTMLElement)

      console.log("[RUNTIME LOG] Right-click/contextmenu event triggered", {
        element: bubbleEl,
        messageId: msg._id,
        clientMessageId: msg.clientMessageId,
        reactKey: msg.clientMessageId || msg._id,
        conversationId: msg.conversation
      })

      openContextMenu(msg, bubbleEl)
    }

    const handleBubbleClick = (e: React.MouseEvent) => {
      if (isSelectionMode) {
        e.stopPropagation()
        toggleSelectMessage(msg._id)
      }
    }

    const isSent = msg.sender === currentUser?.id

    console.log(
      "Render Message",
      msg._id,
      (msg as Message & { content?: string }).content,
      (msg as Message & { decryptedContent?: string }).decryptedContent,
      msg.encryptedContent,
      {
        clientMessageId: msg.clientMessageId,
        senderDeviceId: msg.senderDeviceId,
        currentDeviceId,
        isSent,
        encryptedPayloads: msg.encryptedPayloads?.map((payload) => ({
          recipientDeviceId: payload.recipientDeviceId,
          encryptedContent: Boolean(payload.encryptedContent),
          nonce: Boolean(payload.nonce)
        })),
        receiverDevicesLoaded: Boolean(receiverDevices),
        receiverDeviceIds: receiverDevices?.map((device) => device.deviceId),
        senderDevicesLoaded: Boolean(senderDevices),
        senderDeviceIds: senderDevices?.map((device) => device.deviceId),
        identityPrivateKeyLoaded: Boolean(identityPrivateKey),
        receiverPublicKeyLoaded: Boolean(receiverPublicKey)
      }
    )

    const senderPublicKeyToUse = useMemo(() => {
      let key = receiverPublicKey
      if (msg.senderDeviceId) {
        const senderDevice = isSent
          ? senderDevices?.find(d => d.deviceId === msg.senderDeviceId)
          : receiverDevices?.find(d => d.deviceId === msg.senderDeviceId)

        if (senderDevice) {
          key = senderDevice.publicKey
        } else {
          return null
        }
      }
      return key
    }, [msg.senderDeviceId, isSent, senderDevices, receiverDevices, receiverPublicKey])

    const decryptedText = useMemo(() => {
      console.group("MESSAGE DECRYPT")
      const endDecryptLog = (decryptResult: string, reason: string) => {
        console.log("messageId", msg._id)
        console.log("clientMessageId", msg.clientMessageId)
        console.log("sender", msg.sender)
        console.log("currentUser", currentUser?.id)
        console.log("isSent", isSent)
        console.log("messageSenderDeviceId", msg.senderDeviceId)
        console.log("currentDeviceId", currentDeviceId)
        console.log("encryptedContent", Boolean(msg.encryptedContent))
        console.log("nonce", msg.nonce)
        console.log("encryptedPayloads", msg.encryptedPayloads)
        console.log("senderPublicKeyToUse", senderPublicKeyToUse)
        console.log("privateKeyLoaded", Boolean(identityPrivateKey))
        console.log("reason", reason)
        console.log("decryptResult", decryptResult)
        console.groupEnd()
        return decryptResult
      }

      if (msg.type === "system") {
        return endDecryptLog(msg.encryptedContent ?? "", "system-message")
      }

      if (!identityPrivateKey) {
        return endDecryptLog("[Decryption keys missing]", "identity-private-key-missing")
      }
      const encryptedPayload = currentDeviceId
        ? msg.encryptedPayloads?.find(
            (payload: EncryptedPayload) =>
              payload.recipientDeviceId === currentDeviceId
          )
        : undefined

      let encryptedContent = msg.encryptedContent
      let nonce = msg.nonce

      // New multi-device message
      if (msg.encryptedPayloads?.length) {
        if (!currentDeviceId) {
          return endDecryptLog("[Device id missing]", "current-device-id-missing")
        }
        if (!encryptedPayload) {
          return endDecryptLog("[Unable to decrypt message]", "payload-for-current-device-missing")
        }
        encryptedContent = encryptedPayload.encryptedContent
        nonce = encryptedPayload.nonce
      }
      // Legacy message
      else if (!encryptedContent || !nonce) {
        return endDecryptLog("", "legacy-payload-missing")
      }

      if (!senderPublicKeyToUse) {
        return endDecryptLog("[Unable to decrypt message]", msg.senderDeviceId ? "sender-device-not-loaded" : "sender-public-key-missing")
      }

      const decrypted = decryptMessage(
        encryptedContent,
        nonce,
        senderPublicKeyToUse,
        identityPrivateKey
      )
      return endDecryptLog(decrypted, "decrypt-called")
    }, [
      msg.encryptedContent,
      msg.nonce,
      msg.encryptedPayloads,
      msg._id,
      msg.clientMessageId,
      msg.sender,
      senderPublicKeyToUse,
      identityPrivateKey,
      msg.type,
      isSent,
      msg.senderDeviceId,
      currentDeviceId,
      currentUser?.id
    ])
    const parsedMessage = useMemo(() => {
      if (!decryptedText) return { text: "", isLiveBlock: false, blockId: "", file: null }
      let text = decryptedText
      let file = null
      try {
        const parsed = JSON.parse(decryptedText)
        text = parsed.text !== undefined ? parsed.text : text
        file = parsed.file || null
      } catch {
        // Not JSON
      }

      const liveBlockRegex = /\[liveblock:([a-fA-F0-9]{24})\]/
      const match = text.match(liveBlockRegex)
      if (match) {
        return {
          text,
          isLiveBlock: true,
          blockId: match[1],
          file
        }
      }

      return {
        text,
        isLiveBlock: false,
        blockId: "",
        file
      }
    }, [decryptedText])

    const time = useMemo(() => {
      return new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    }, [msg.createdAt])

    const queryClient = useQueryClient()
    const repliedMessage = useMemo(() => {
      if (!msg.replyTo) return null
      const messagesData = queryClient.getQueryData<any>(["messages", msg.conversation])
      if (!messagesData?.pages) return null
      for (const page of messagesData.pages) {
        const found = page.data.find((m: any) => m._id === msg.replyTo)
        if (found) return found
      }
      return null
    }, [msg.replyTo, msg.conversation, queryClient])

  const receiptState = useMemo(() => {
    const receipts = msg.deliveryReceipts || [];

    if (receipts.length === 0) {
      return "sent";
    }

    if (receipts.every((receipt) => Boolean(receipt.readAt))) {
      return "read";
    }

    if (
      receipts.every((receipt) =>
        Boolean(receipt.deliveredAt || receipt.readAt)
      )
    ) {
      return "delivered";
    }

    return "sent";
  }, [msg.deliveryReceipts]);

  const fileMeta = parsedMessage.file || msg.fileMeta;

  const messageType = useMemo(() => {
    if (msg.type === "system") return "system";
    if (!fileMeta) return "text";
    const mime = fileMeta.mimeType || "";
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    return "document";
  }, [msg.type, fileMeta]);

    const isSelected = selectedMessageIds.includes(msg._id)
    const isStarred = msg.starredBy?.includes(currentUser?.id || "")
    const isPinned = msg.isPinned
    const isDeleted = msg.isDeletedForEveryone

    const reactionSummary = useMemo(() => {
      if (!msg.reactions || msg.reactions.length === 0) return null
      const emojis = Array.from(new Set(msg.reactions.map((r) => r.emoji)))
      return {
        emojis,
        count: msg.reactions.length
      }
    }, [msg.reactions])

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={cn(
          "flex w-full mb-3 items-center gap-3 transition-all relative group/bubble",
          isSent ? "justify-end" : "justify-start",
          isSelected ? "bg-orange-500/10 rounded-xl" : ""
        )}
        onClick={handleBubbleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        {isSelectionMode && msg._id && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelectMessage(msg._id)}
            className="h-4.5 w-4.5 rounded border-gray-300 text-orange-500 focus:ring-orange-400 shrink-0 cursor-pointer ml-2"
          />
        )}

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
            "bubble-card max-w-[85%] md:max-w-[75%] px-4 py-2.5 rounded-2xl relative shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-0.5 min-w-[90px]",
            isSent 
              ? "bg-gradient-to-br from-[#FFAF38] to-[#FF8C00] text-white rounded-tr-none" 
              : "bg-white/90 border border-white/60 text-gray-800 rounded-tl-none backdrop-blur-md"
          )}>
            
            {/* 1. Pin Banner */}
            {isPinned && (
              <div className={cn(
                "flex items-center gap-1 text-[9px] font-black uppercase tracking-widest mb-1 select-none",
                isSent ? "text-white/60" : "text-gray-400"
              )}>
                <Pin className="h-3 w-3 rotate-45 shrink-0" />
                <span>Pinned</span>
              </div>
            )}

            {/* 2. Quoted Reply Message Preview */}
            {repliedMessage && !isDeleted && (
              <div className={cn(
                "mb-1.5 p-2 rounded-lg border-l-4 text-[11px] select-none text-left",
                isSent 
                  ? "bg-white/10 border-white/60 text-white/95" 
                  : "bg-gray-50 border-orange-500 text-gray-600"
              )}>
                <span className={cn(
                  "font-bold block text-[10px]",
                  isSent ? "text-white/80" : "text-orange-500"
                )}>
                  {repliedMessage.sender === currentUser?.id ? "You" : "Participant"}
                </span>
                <p className="truncate mt-0.5">
                  {(() => {
                    let decText = repliedMessage.encryptedContent || ""
                    const cacheText = queryClient.getQueryData<any>(["decrypted", repliedMessage._id]) || localStorage.getItem(`decrypted-${repliedMessage._id}`)
                    if (cacheText) decText = cacheText
                    try {
                      const parsed = JSON.parse(decText)
                      return parsed.text || "📎 Attachment"
                    } catch {
                      return decText || "📎 Attachment"
                    }
                  })()}
                </p>
              </div>
            )}

            {/* 3. Soft Deleted placeholder */}
            {isDeleted ? (
              <div className="flex items-center gap-2 text-gray-400/80 italic text-xs select-none py-1.5 px-1 font-semibold text-left">
                <span className="text-gray-400/60">🚫</span>
                <span>{isSent ? "You deleted this message" : "This message was deleted"}</span>
              </div>
            ) : (
              <>
                {/* Render Media attachment if exists */}
                {fileMeta && (
                  <div className="mb-1.5 self-start">
                    {messageType === "image" && (
                      <ImageMessage
                        url={fileMeta.url || ""}
                        fileName={fileMeta.fileName || fileMeta.name || ""}
                        status={fileMeta.status}
                        progress={fileMeta.progress}
                        onClick={() => openViewer(msg._id, msg.conversation)}
                      />
                    )}
                    {messageType === "video" && (
                      <VideoMessage
                        url={fileMeta.url || ""}
                        fileName={fileMeta.fileName || fileMeta.name || ""}
                        status={fileMeta.status}
                        progress={fileMeta.progress}
                        onClick={() => openViewer(msg._id, msg.conversation)}
                      />
                    )}
                    {messageType === "audio" && (
                      <AudioMessage
                        url={fileMeta.url || ""}
                        fileName={fileMeta.fileName || fileMeta.name || ""}
                        status={fileMeta.status}
                        progress={fileMeta.progress}
                      />
                    )}
                    {messageType === "document" && (
                      <DocumentMessage
                        url={fileMeta.url || ""}
                        fileName={fileMeta.fileName || fileMeta.name || "Unnamed File"}
                        size={fileMeta.size || 0}
                        mimeType={fileMeta.mimeType || ""}
                        status={fileMeta.status}
                        progress={fileMeta.progress}
                        onCancel={() => document.dispatchEvent(new CustomEvent("chat-message-cancel", { detail: { tempId: msg._id } }))}
                        onRetry={() => document.dispatchEvent(new CustomEvent("chat-message-retry", { detail: { tempId: msg._id } }))}
                      />
                    )}
                  </div>
                )}

                {/* Render Text message or media caption */}
                {parsedMessage.text && (
                  <p className="text-[14px] leading-relaxed font-semibold break-words text-left pr-4">
                    {parsedMessage.text}
                  </p>
                )}
              </>
            )}
            
            {/* Timestamp and status row */}
            <div className={cn(
              "flex items-center gap-1 select-none text-[9px] font-bold uppercase tracking-wider self-end mt-0.5",
              isSent ? "text-white/80" : "text-gray-400"
            )}>
              {/* Edited indicator */}
              {msg.isEdited && (
                <span className="opacity-75 italic">(Edited)</span>
              )}

              {/* Star icon */}
              {isStarred && (
                <Star className={cn("h-3 w-3 fill-amber-400 text-amber-400 shrink-0", isSent ? "text-amber-300" : "text-amber-500")} />
              )}

              <span>{time}</span>
              
              {isSent && !isDeleted && (
                receiptState === "read" ? (
                  <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" />
                ) : receiptState === "delivered" ? (
                  <CheckCheck className="w-3.5 h-3.5 text-white/70" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-white/70" />
                )
              )}
            </div>

            {/* Reactions pill */}
            {reactionSummary && (
              <div 
                className={cn(
                  "absolute -bottom-2.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black shadow-sm border select-none bg-white",
                  isSent ? "right-3 border-orange-100 text-orange-500" : "left-3 border-gray-100 text-gray-600"
                )}
              >
                <span className="flex items-center gap-0.5">
                  {reactionSummary.emojis.map((emoji) => (
                    <span key={emoji}>{emoji}</span>
                  ))}
                </span>
                {reactionSummary.count > 1 && (
                  <span className="ml-0.5 text-[8px] font-black">{reactionSummary.count}</span>
                )}
              </div>
            )}

          </div>
        )}
      </motion.div>
    )
  })

  MessageBubble.displayName = "MessageBubble"

  export default MessageBubble
