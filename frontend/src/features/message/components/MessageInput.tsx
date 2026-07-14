import { useState, useRef, useEffect } from "react"
import axios from "axios"
import api from "../../../lib/axios"
import { useSendMessage } from "../hooks/useSendMessage"
import { useAuthStore } from "../../../store/auth.store"
import { useChatStore } from "../../../store/chat.store"
import { encryptMessage } from "../../../utils/crypto"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import { emitTypingStart, emitTypingStop } from "../../../lib/socket"
import { Send, Paperclip, Smile, PlusCircle } from "lucide-react"
import { Button } from "../../../components/ui/Button"
import { motion } from "framer-motion"
import { CreateLiveBlockModal } from "../../chat/components/CreateLiveBlockModal"
import { getUserDevices, getUsersDevices } from "../../device/device.service"
import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"
import { getParticipantUserId, isParticipantCurrentUser } from "../../conversation/types/conversation.types"
import type { Device, DeviceInfo } from "../../device/types/device.types"
import type { EncryptedPayload } from "../types/message.types"
import { queryClient } from "../../../lib/queryClient"
import { useContextMenuStore } from "../../../store/contextMenu.store"
import { useMessageActions } from "../hooks/useMessageActions"
import { X } from "lucide-react"
import { decryptedCache } from "../../../utils/decryptedCache"

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
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileRefMap = useRef<Map<string, File>>(new Map())
  const cancelSourceMap = useRef<Map<string, any>>(new Map())

  const getActiveDevicesForConversation = async (): Promise<(Device | DeviceInfo)[]> => {
    const senderUserId = currentUser?.id
    if (!senderUserId) return []

    let activeDevices: (Device | DeviceInfo)[] = []

    if (currentConvo?.type === "group") {
      const participantUserIds = currentConvo.participants.map((p) => {
        const u = p.user as any
        return (u?._id || p.user).toString()
      })

      let cachedGroupDevices = queryClient.getQueryData<DeviceInfo[]>(["devices", "group", conversationId])
      if (!cachedGroupDevices) {
        cachedGroupDevices = await getUsersDevices(participantUserIds)
        queryClient.setQueryData(["devices", "group", conversationId], cachedGroupDevices)
      }
      activeDevices = (cachedGroupDevices || []).filter((d) => d.isActive)
    } else if (currentConvo) {
      const receiver = currentConvo.participants.find(
        (p: ConversationParticipant) => !isParticipantCurrentUser(p, currentUser?.id)
      )
      const receiverUserId = getParticipantUserId(receiver)
      if (!receiverUserId) return []

      let receiverAllDevices = queryClient.getQueryData<Device[]>(["devices", "user", receiverUserId])
      if (!receiverAllDevices) {
        receiverAllDevices = await getUserDevices(receiverUserId)
        queryClient.setQueryData(["devices", "user", receiverUserId], receiverAllDevices)
      }

      let senderAllDevices = queryClient.getQueryData<Device[]>(["devices", "user", senderUserId])
      if (!senderAllDevices) {
        senderAllDevices = await getUserDevices(senderUserId)
        queryClient.setQueryData(["devices", "user", senderUserId], senderAllDevices)
      }

      activeDevices = [
        ...(receiverAllDevices || []).filter((d) => d.isActive).map(d => ({ ...d, userId: receiverUserId })),
        ...(senderAllDevices || []).filter((d) => d.isActive).map(d => ({ ...d, userId: senderUserId }))
      ]
    }
    return activeDevices
  }

  const uploadAndSendFile = async (file: File, tempId: string) => {
    const { identityPrivateKey, deviceId: senderDeviceId } = useAuthStore.getState()
    if (!identityPrivateKey || !senderDeviceId) {
      console.warn("Keys or deviceId missing on sender side")
      return
    }

    fileRefMap.current.set(tempId, file)

    const localUrl = URL.createObjectURL(file)
    const optimisticMsg: any = {
      _id: tempId,
      conversation: conversationId,
      sender: currentUser?.id || "",
      senderDeviceId,
      type: file.type.startsWith("image/") ? "image" : "file",
      fileMeta: {
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        url: localUrl,
        progress: 0,
        status: "uploading"
      },
      deliveryReceipts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clientMessageId: tempId
    }

    queryClient.setQueryData(["messages", conversationId], (old: any) => {
      if (!old || !old.pages) return { pages: [{ data: [optimisticMsg], pagination: { nextCursor: null, hasMore: false } }] }
      const newPages = [...old.pages]
      if (newPages.length === 0) {
        newPages[0] = { data: [optimisticMsg], pagination: { nextCursor: null, hasMore: false } }
      } else {
        newPages[0] = {
          ...newPages[0],
          data: [...newPages[0].data, optimisticMsg]
        }
      }
      return { ...old, pages: newPages }
    })

    useChatStore.getState().setLatestMessage(optimisticMsg)

    const CancelToken = axios.CancelToken
    const source = CancelToken.source()
    cancelSourceMap.current.set(tempId, source)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await api.post("/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        cancelToken: source.token,
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || file.size
          const progress = Math.round((progressEvent.loaded * 100) / total)

          queryClient.setQueryData(["messages", conversationId], (old: any) => {
            if (!old || !old.pages) return old
            const pages = old.pages.map((page: any) => ({
              ...page,
              data: page.data.map((msg: any) => {
                if (msg._id === tempId) {
                  return {
                    ...msg,
                    fileMeta: { ...msg.fileMeta, progress }
                  }
                }
                return msg
              })
            }))
            return { ...old, pages }
          })
        }
      })

      const fileMeta = uploadRes.data.data

      const payloadObj = { text: "", file: fileMeta }
      const activeDevices = await getActiveDevicesForConversation()
      if (activeDevices.length === 0) {
        throw new Error("No active devices found for conversation")
      }

      const devicesById = new Map<string, { userId: string; device: Device | DeviceInfo }>()
      activeDevices.forEach((device) => {
        const userId = (device as any).userId || ("user" in device ? device.user : undefined)
        if (userId) {
          devicesById.set(device.deviceId, {
            userId: typeof userId === "object" ? (userId as any)._id.toString() : String(userId),
            device
          })
        }
      })

      const encryptedPayloads = Array.from(devicesById.values()).map(
        ({ userId, device }) => {
          const { encryptedContent, nonce } = encryptMessage(
            JSON.stringify(payloadObj),
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

      await mutateAsync({
        conversationId,
        encryptedPayloads,
        clientMessageId: tempId,
        senderDeviceId,
        signature: "",
        type: file.type.startsWith("image/") ? "image" : "file",
        fileMeta
      })

      fileRefMap.current.delete(tempId)
      cancelSourceMap.current.delete(tempId)

    } catch (error: any) {
      if (axios.isCancel(error)) {
        console.log("Upload canceled:", error.message)
        return
      }
      console.error("Failed to upload/send file:", error)

      queryClient.setQueryData(["messages", conversationId], (old: any) => {
        if (!old || !old.pages) return old
        const pages = old.pages.map((page: any) => ({
          ...page,
          data: page.data.map((msg: any) => {
            if (msg._id === tempId) {
              return {
                ...msg,
                fileMeta: { ...msg.fileMeta, status: "failed" as const }
              }
            }
            return msg
          })
        }))
        return { ...old, pages }
      })
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = (files: File[]) => {
    files.forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 20MB limit.`)
        return
      }
      if (file.name.match(/\.(exe|bat|cmd|sh|msi|vbs|js|ts|com|scr|pif)$/i)) {
        alert(`File ${file.name} is blocked for security reasons.`)
        return
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`
      uploadAndSendFile(file, tempId)
    })
  }

  useEffect(() => {
    const handleFilesDropped = (e: Event) => {
      const files = (e as CustomEvent<File[]>).detail
      if (files && files.length > 0) {
        handleFiles(files)
      }
    }

    const handleRetry = (e: Event) => {
      const { tempId } = (e as CustomEvent<{ tempId: string }>).detail
      const file = fileRefMap.current.get(tempId)
      if (file) {
        uploadAndSendFile(file, tempId)
      }
    }

    const handleCancel = (e: Event) => {
      const { tempId } = (e as CustomEvent<{ tempId: string }>).detail
      const source = cancelSourceMap.current.get(tempId)
      if (source) {
        source.cancel("Upload canceled by user")
        cancelSourceMap.current.delete(tempId)
      }
      fileRefMap.current.delete(tempId)

      queryClient.setQueryData(["messages", conversationId], (old: any) => {
        if (!old || !old.pages) return old
        const pages = old.pages.map((page: any) => ({
          ...page,
          data: page.data.filter((msg: any) => msg._id !== tempId)
        }))
        return { ...old, pages }
      })
    }

    document.addEventListener("chat-files-dropped", handleFilesDropped)
    document.addEventListener("chat-message-retry", handleRetry)
    document.addEventListener("chat-message-cancel", handleCancel)

    return () => {
      document.removeEventListener("chat-files-dropped", handleFilesDropped)
      document.removeEventListener("chat-message-retry", handleRetry)
      document.removeEventListener("chat-message-cancel", handleCancel)
    }
  }, [conversationId, currentConvo])

  const myParticipant = currentConvo?.participants.find(
    (p: ConversationParticipant) => isParticipantCurrentUser(p, currentUser?.id)
  )
  const isOnlyAdminsCanSend = currentConvo?.groupSettings?.onlyAdminsCanSend ?? false
  const isRequesterAdminOrOwner = myParticipant && myParticipant.role && ["owner", "admin"].includes(myParticipant.role as any)
  const cannotSend = currentConvo?.type === "group" && isOnlyAdminsCanSend && !isRequesterAdminOrOwner

  const { replyingToMessage, setReplyingToMessage, editingMessage, setEditingMessage } = useContextMenuStore()
  const { editMessage } = useMessageActions(conversationId)

  useEffect(() => {
    if (editingMessage) {
      let decText = editingMessage.encryptedContent || ""
      const cacheText = queryClient.getQueryData<any>(["decrypted", editingMessage._id]) || localStorage.getItem(`decrypted-${editingMessage._id}`)
      if (cacheText) {
        decText = cacheText
      }
      try {
        const parsed = JSON.parse(decText)
        decText = parsed.text || decText
      } catch {
        // Not JSON
      }
      setText(decText)
    } else {
      setText("")
    }
  }, [editingMessage])

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

    const senderUserId = currentUser?.id
    if (!senderUserId) {
      console.warn("Sender user ID not found")
      return
    }

    let activeDevices: (Device | DeviceInfo)[] = [];

    if (currentConvo.type === "group") {
      const participantUserIds = currentConvo.participants.map((p) => {
        const u = p.user as any;
        return (u?._id || p.user).toString();
      });

      let cachedGroupDevices = queryClient.getQueryData<DeviceInfo[]>(["devices", "group", conversationId]);
      if (!cachedGroupDevices) {
        try {
          cachedGroupDevices = await getUsersDevices(participantUserIds);
          queryClient.setQueryData(["devices", "group", conversationId], cachedGroupDevices);
        } catch (error) {
          console.error("Failed to fetch group devices:", error);
          return;
        }
      }
      activeDevices = (cachedGroupDevices || []).filter((d) => d.isActive);
    } else {
      const receiver = currentConvo.participants.find(
        (p: ConversationParticipant) => !isParticipantCurrentUser(p, currentUser?.id)
      )
      const receiverUserId = getParticipantUserId(receiver)
      if (!receiverUserId) {
        console.warn("Receiver user ID not found")
        return
      }

      let receiverAllDevices = queryClient.getQueryData<Device[]>(["devices", "user", receiverUserId]);
      if (!receiverAllDevices) {
        try {
          receiverAllDevices = await getUserDevices(receiverUserId);
          queryClient.setQueryData(["devices", "user", receiverUserId], receiverAllDevices);
        } catch (error) {
          console.error("Failed to fetch receiver devices:", error);
          return;
        }
      }

      let senderAllDevices = queryClient.getQueryData<Device[]>(["devices", "user", senderUserId]);
      if (!senderAllDevices) {
        try {
          senderAllDevices = await getUserDevices(senderUserId);
          queryClient.setQueryData(["devices", "user", senderUserId], senderAllDevices);
        } catch (error) {
          console.error("Failed to fetch sender devices:", error);
          return;
        }
      }

      activeDevices = [
        ...(receiverAllDevices || []).filter((d) => d.isActive).map(d => ({ ...d, userId: receiverUserId })),
        ...(senderAllDevices || []).filter((d) => d.isActive).map(d => ({ ...d, userId: senderUserId }))
      ];
    }

    if (activeDevices.length === 0) {
      console.warn("No active devices found for conversation")
      return
    }

    const payload = { text: messageText.trim(), file: null }

    try {
      const devicesById = new Map<string, { userId: string; device: Device | DeviceInfo }>()

      activeDevices.forEach((device) => {
        const userId = (device as any).userId || ("user" in device ? device.user : undefined);
        if (!userId) {
          console.warn("Device missing userId or user property:", device)
          return
        }
        devicesById.set(device.deviceId, {
          userId: typeof userId === "object" ? (userId as any)._id.toString() : String(userId),
          device
        })
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

      if (replyingToMessage) {
        console.log("[RUNTIME LOG] Reply executes", {
          action: "reply",
          messageId: replyingToMessage._id,
          apiPayload: {
            conversationId,
            replyTo: replyingToMessage._id,
            encryptedPayloads
          },
          socketPayload: null
        })
      }

      await mutateAsync({
        conversationId,
        encryptedPayloads,
        clientMessageId: crypto.randomUUID(),
        senderDeviceId,
        signature: "",
        replyTo: replyingToMessage?._id || undefined
      })

      if (replyingToMessage) {
        setReplyingToMessage(null)
      }

    } catch (error) {
      console.error("Failed to send message:", error)
    }
  };

  const sendEditedMessage = async (messageText: string) => {
    if (!editingMessage) return
    const { identityPrivateKey, deviceId: senderDeviceId } = useAuthStore.getState()
    if (!identityPrivateKey || !senderDeviceId) {
      console.warn("Keys missing")
      return
    }

    const currentConvo = conversations?.find((c: Conversation) => c._id === conversationId)
    if (!currentConvo) return

    const senderUserId = currentUser?.id
    if (!senderUserId) return

    const activeDevices = await getActiveDevicesForConversation()
    if (activeDevices.length === 0) return

    const payload = { text: messageText.trim(), file: editingMessage.fileMeta || null }

    try {
      const devicesById = new Map<string, { userId: string; device: Device | DeviceInfo }>()
      activeDevices.forEach((device) => {
        const userId = (device as any).userId || ("user" in device ? device.user : undefined)
        if (userId) {
          devicesById.set(device.deviceId, {
            userId: typeof userId === "object" ? (userId as any)._id.toString() : String(userId),
            device
          })
        }
      })

      const encryptedPayloads = Array.from(devicesById.values()).map(
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

      console.log("[RUNTIME LOG] Edit executes", {
        action: "edit",
        messageId: editingMessage._id,
        apiPayload: {
          messageId: editingMessage._id,
          encryptedPayloads
        },
        socketPayload: null
      })

      await editMessage.mutateAsync({
        messageId: editingMessage._id,
        encryptedContent: "",
        nonce: "",
        encryptedPayloads
      })

      // Update local cache
      decryptedCache.set(editingMessage._id, messageText.trim())
      localStorage.setItem(`decrypted-${editingMessage._id}`, messageText.trim())

      setEditingMessage(null)
    } catch (err) {
      console.error("Failed to edit message:", err)
    }
  };

  const send = async () => {
    if (!text.trim()) return
    emitTypingStop(conversationId)
    if (editingMessage) {
      await sendEditedMessage(text)
    } else {
      await sendEncryptedMessage(text)
    }
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
      {/* Reply Preview */}
      {replyingToMessage && (
        <div className="mb-2 mx-2 p-3 bg-white/80 border border-white/50 backdrop-blur-md rounded-2xl flex items-center justify-between shadow-sm animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex-1 min-w-0 border-l-4 border-orange-500 pl-3">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
              Replying to Message
            </span>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {(() => {
                let decText = replyingToMessage.encryptedContent || ""
                const cacheText = queryClient.getQueryData<any>(["decrypted", replyingToMessage._id]) || localStorage.getItem(`decrypted-${replyingToMessage._id}`)
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
          <button
            onClick={() => setReplyingToMessage(null)}
            className="p-1 rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-655 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Edit Preview */}
      {editingMessage && (
        <div className="mb-2 mx-2 p-3 bg-white/80 border border-white/50 backdrop-blur-md rounded-2xl flex items-center justify-between shadow-sm animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex-1 min-w-0 border-l-4 border-indigo-500 pl-3">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
              Editing Message
            </span>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              Prefilled original text in input box
            </p>
          </div>
          <button
            onClick={() => setEditingMessage(null)}
            className="p-1 rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-655 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
              multiple
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full shrink-0 hidden sm:flex"
            >
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
