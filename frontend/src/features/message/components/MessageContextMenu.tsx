import { useEffect, useRef, useMemo, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { useContextMenuStore } from "../../../store/contextMenu.store"
import { useAuthStore } from "../../../store/auth.store"
import { useMessageActions } from "../hooks/useMessageActions"
import { useQueryClient } from "@tanstack/react-query"
import { 
  Reply, Edit3, Trash, Trash2, Copy, Pin, Star, Info, CheckSquare, Download
} from "lucide-react"
import type { Message } from "../types/message.types"

interface MessageContextMenuProps {
  onOpenInfo: (message?: Message) => void
}

export function MessageContextMenu({ onOpenInfo }: MessageContextMenuProps) {
  const queryClient = useQueryClient()
  const { 
    isOpen, message, messageElement, closeMenu, 
    setReplyingToMessage, setEditingMessage, 
    setSelectionMode, toggleSelectMessage
  } = useContextMenuStore()
  
  const currentUser = useAuthStore((s) => s.user)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Fetch actions hook
  const conversationId = message?.conversation || ""
  const { deleteForMe, deleteForEveryone, reactToMessage, togglePin, toggleStar } = useMessageActions(conversationId)

  // Dynamically resolve the freshest version of this message from React Query cache
  const messageId = message?._id || message?.clientMessageId
  const latestMessage = useMemo(() => {
    if (!messageId || !conversationId) return null
    const messagesData = queryClient.getQueryData<any>(["messages", conversationId])
    if (!messagesData?.pages) return message
    for (const page of messagesData.pages) {
      const found = page.data.find((m: any) => m._id === messageId || m.clientMessageId === messageId)
      if (found) return found
    }
    return message
  }, [messageId, conversationId, queryClient, message])

  // Context coordinates state
  const [style, setStyle] = useState<React.CSSProperties>({
    position: "fixed",
    visibility: "hidden",
    opacity: 0
  })

  // Anchoring calculation relative to message bubble card boundingClientRect
  const updatePosition = useCallback(() => {
    if (!messageElement || !latestMessage) return

    const rect = messageElement.getBoundingClientRect()
    const menuWidth = 220
    const menuHeight = 350
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Check if message is sent by me or received
    const senderId = typeof latestMessage.sender === "object" && latestMessage.sender !== null
      ? (latestMessage.sender as any)._id
      : latestMessage.sender
    const isSent = String(senderId) === String(currentUser?.id)

    // Horizontal alignment: right-aligned for sent, left-aligned for received
    let posX = isSent ? rect.right - menuWidth : rect.left
    posX = Math.max(16, Math.min(viewportWidth - menuWidth - 16, posX))

    // Vertical alignment: check if there's enough space above bubble card
    const canRenderAbove = rect.top - menuHeight - 12 > 16
    let posY = canRenderAbove ? rect.top - menuHeight - 12 : rect.bottom + 12
    posY = Math.max(16, Math.min(viewportHeight - menuHeight - 16, posY))

    setStyle({
      position: "fixed",
      top: posY,
      left: posX,
      visibility: "visible",
      opacity: 1,
      transition: "none"
    })
  }, [messageElement, latestMessage, currentUser])

  // Position updates on mount, scroll, and resize
  useEffect(() => {
    if (!isOpen) return
    updatePosition()
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)
    return () => {
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [isOpen, updatePosition])

  // Handle outside clicks, ESC, scroll, resize to close
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }

    const handleDismiss = () => {
      closeMenu()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("scroll", handleDismiss, true)
    window.addEventListener("resize", handleDismiss)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("scroll", handleDismiss, true)
      window.removeEventListener("resize", handleDismiss)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, closeMenu])

  // Close on conversation change or if message was removed from cache
  useEffect(() => {
    if (isOpen && (!message || !latestMessage)) {
      closeMenu()
    }
  }, [message?.conversation, latestMessage, isOpen, closeMenu, message])

  // Instrument rendering logs
  useEffect(() => {
    if (isOpen && latestMessage) {
      console.log("[RUNTIME LOG] MessageContextMenu renders via Portal", {
        selectedMessageId: message?._id || message?.clientMessageId,
        renderedMessageId: latestMessage?._id || latestMessage?.clientMessageId,
        style
      })
    }
  }, [isOpen, message, latestMessage, style])

  if (!isOpen || !message || !latestMessage) return null

  const senderId = typeof latestMessage.sender === "object" && latestMessage.sender !== null
    ? (latestMessage.sender as any)._id
    : latestMessage.sender
  const isSentByMe = String(senderId) === String(currentUser?.id)
  const ageInMs = Date.now() - new Date(latestMessage.createdAt).getTime()
  const isWithinWindow = ageInMs < 15 * 60 * 1000 // 15 mins
  const canEditOrDeleteForEveryone = isSentByMe && isWithinWindow && !latestMessage.isDeletedForEveryone

  const handleEmojiReact = async (emoji: string) => {
    const canonicalId = latestMessage._id
    if (!canonicalId) return
    console.log("[RUNTIME LOG] React executes", {
      action: "react",
      messageId: canonicalId,
      apiPayload: { emoji },
      socketPayload: null
    })
    await reactToMessage.mutateAsync({ messageId: canonicalId, emoji })
    closeMenu()
  }

  const handleCopy = () => {
    console.log("[RUNTIME LOG] Copy executes", {
      action: "copy",
      messageId: latestMessage._id || latestMessage.clientMessageId
    })
    let copyText = latestMessage.encryptedContent || ""
    const cacheText = queryClient.getQueryData<any>(["decrypted", latestMessage._id]) || localStorage.getItem(`decrypted-${latestMessage._id}`)
    if (cacheText) {
      copyText = cacheText
    }
    
    try {
      const parsed = JSON.parse(copyText)
      copyText = parsed.text || copyText
    } catch {
      // Keep as-is
    }

    navigator.clipboard.writeText(copyText)
    closeMenu()
  }

  const handleDownload = async () => {
    console.log("[RUNTIME LOG] Download executes", {
      action: "download",
      messageId: latestMessage._id || latestMessage.clientMessageId
    })
    if (!latestMessage.fileMeta?.url) return
    const { url, fileName } = latestMessage.fileMeta
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = fileName || "download"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, "_blank")
    }
    closeMenu()
  }

  const isStarred = latestMessage.starredBy?.includes(currentUser?.id || "")
  const isPinned = latestMessage.isPinned
  
  // Stale check for optimistic messages.
  const isOptimistic = Boolean(latestMessage.clientMessageId && (!latestMessage._id || latestMessage._id === latestMessage.clientMessageId))

  return createPortal(
    <div 
      ref={menuRef}
      style={style}
      className="z-[9999] bg-white rounded-2xl shadow-xl border border-gray-100 p-2 min-w-[200px] flex flex-col gap-1 select-none animate-in fade-in zoom-in-95 duration-100 text-gray-800"
    >
      {/* 1. Emoji Reaction Bar */}
      {!latestMessage.isDeletedForEveryone && !isOptimistic && (
        <div className="flex items-center justify-around border-b border-gray-50 pb-2 mb-1 px-1 gap-1">
          {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiReact(emoji)}
              className="text-lg hover:scale-125 active:scale-95 p-1 rounded-lg hover:bg-orange-50 transition-all cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* 2. Menu Action Items */}
      {!latestMessage.isDeletedForEveryone && !isOptimistic && (
        <button
          type="button"
          onClick={() => {
            console.log("[RUNTIME LOG] Reply trigger executes", {
              action: "reply",
              messageId: latestMessage._id || latestMessage.clientMessageId
            })
            setReplyingToMessage(latestMessage)
            closeMenu()
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Reply className="h-4 w-4" />
          <span>Reply</span>
        </button>
      )}

      {canEditOrDeleteForEveryone && !isOptimistic && (
        <button
          type="button"
          onClick={() => {
            console.log("[RUNTIME LOG] Edit trigger executes", {
              action: "edit",
              messageId: latestMessage._id || latestMessage.clientMessageId
            })
            setEditingMessage(latestMessage)
            closeMenu()
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Edit3 className="h-4 w-4" />
          <span>Edit Message</span>
        </button>
      )}

      {!latestMessage.isDeletedForEveryone && (
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Copy className="h-4 w-4" />
          <span>Copy Text</span>
        </button>
      )}

      {!latestMessage.isDeletedForEveryone && !isOptimistic && (
        <button
          type="button"
          onClick={() => {
            if (latestMessage._id) {
              console.log("[RUNTIME LOG] Pin executes", {
                action: "pin",
                messageId: latestMessage._id,
                apiPayload: { isPinned: !isPinned },
                socketPayload: null
              })
              togglePin.mutate({ messageId: latestMessage._id })
            }
            closeMenu()
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Pin className="h-4 w-4" />
          <span>{isPinned ? "Unpin Message" : "Pin Message"}</span>
        </button>
      )}

      {!latestMessage.isDeletedForEveryone && !isOptimistic && (
        <button
          type="button"
          onClick={() => {
            if (latestMessage._id) {
              console.log("[RUNTIME LOG] Star executes", {
                action: "star",
                messageId: latestMessage._id,
                apiPayload: { isStarred: !isStarred },
                socketPayload: null
              })
              toggleStar.mutate({ messageId: latestMessage._id })
            }
            closeMenu()
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Star className="h-4 w-4" />
          <span>{isStarred ? "Unstar Message" : "Star Message"}</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          onOpenInfo(latestMessage)
          closeMenu()
        }}
        className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
      >
        <Info className="h-4 w-4" />
        <span>Message Info</span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (latestMessage._id) {
            setSelectionMode(true)
            toggleSelectMessage(latestMessage._id)
          }
          closeMenu()
        }}
        className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
      >
        <CheckSquare className="h-4 w-4" />
        <span>Select Messages</span>
      </button>

      {latestMessage.fileMeta?.url && (
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Download Attachment</span>
        </button>
      )}

      <div className="h-px bg-gray-50 my-1" />

      {/* Delete Operations */}
      {!isOptimistic && latestMessage._id && (
        <button
          type="button"
          onClick={() => {
            console.log("[RUNTIME LOG] Delete for Me executes", {
              action: "deleteForMe",
              messageId: latestMessage._id,
              apiPayload: null,
              socketPayload: null
            })
            deleteForMe.mutate({ messageId: latestMessage._id })
            closeMenu()
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-red-50 text-red-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Trash className="h-4 w-4" />
          <span>Delete for Me</span>
        </button>
      )}

      {canEditOrDeleteForEveryone && !isOptimistic && latestMessage._id && (
        <button
          type="button"
          onClick={() => {
            console.log("[RUNTIME LOG] Delete for Everyone executes", {
              action: "deleteForEveryone",
              messageId: latestMessage._id,
              apiPayload: null,
              socketPayload: null
            })
            deleteForEveryone.mutate({ messageId: latestMessage._id })
            closeMenu()
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-red-50 text-red-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete for Everyone</span>
        </button>
      )}
    </div>,
    document.body
  )
}
