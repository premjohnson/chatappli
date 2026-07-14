import { useEffect, useRef } from "react"
import { useContextMenuStore } from "../../../store/contextMenu.store"
import { useAuthStore } from "../../../store/auth.store"
import { useMessageActions } from "../hooks/useMessageActions"
import { useQueryClient } from "@tanstack/react-query"
import { 
  Reply, Edit3, Trash, Trash2, Copy, Pin, Star, Info, CheckSquare, Download
} from "lucide-react"

interface MessageContextMenuProps {
  onOpenInfo: () => void
}

export function MessageContextMenu({ onOpenInfo }: MessageContextMenuProps) {
  const queryClient = useQueryClient()
  const { 
    isOpen, x, y, message, closeMenu, 
    setReplyingToMessage, setEditingMessage, 
    setSelectionMode, toggleSelectMessage
  } = useContextMenuStore()
  
  const currentUser = useAuthStore((s) => s.user)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Fetch actions hook
  const conversationId = message?.conversation || ""
  const { deleteForMe, deleteForEveryone, reactToMessage, togglePin, toggleStar } = useMessageActions(conversationId)

  // Handle outside clicks to close the context menu
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, closeMenu])

  if (!isOpen || !message) return null

  const isSentByMe = message.sender === currentUser?.id
  const ageInMs = Date.now() - new Date(message.createdAt).getTime()
  const isWithinWindow = ageInMs < 15 * 60 * 1000 // 15 mins
  const canEditOrDeleteForEveryone = isSentByMe && isWithinWindow && !message.isDeletedForEveryone

  const handleEmojiReact = async (emoji: string) => {
    await reactToMessage.mutateAsync({ messageId: message._id, emoji })
    closeMenu()
  }

  const handleCopy = () => {
    // Attempt to parse text in case of encrypted JSON representation
    let copyText = message.encryptedContent || ""
    const cacheText = queryClient.getQueryData<any>(["decrypted", message._id]) || localStorage.getItem(`decrypted-${message._id}`)
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
    if (!message.fileMeta?.url) return
    const { url, fileName } = message.fileMeta
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

  const isStarred = message.starredBy?.includes(currentUser?.id || "")
  const isPinned = message.isPinned

  return (
    <div 
      ref={menuRef}
      style={{ top: y, left: x }}
      className="absolute z-[9999] bg-white rounded-2xl shadow-xl border border-gray-100 p-2 min-w-[200px] flex flex-col gap-1 select-none animate-in fade-in zoom-in-95 duration-100 text-gray-800"
    >
      {/* 1. Emoji Reaction Bar */}
      {!message.isDeletedForEveryone && (
        <div className="flex items-center justify-around border-b border-gray-50 pb-2 mb-1 px-1 gap-1">
          {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiReact(emoji)}
              className="text-lg hover:scale-125 active:scale-95 p-1 rounded-lg hover:bg-orange-50 transition-all cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* 2. Menu Action Items */}
      {!message.isDeletedForEveryone && (
        <button
          onClick={() => {
            setReplyingToMessage(message)
            closeMenu()
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Reply className="h-4 w-4" />
          <span>Reply</span>
        </button>
      )}

      {canEditOrDeleteForEveryone && (
        <button
          onClick={() => {
            setEditingMessage(message)
            closeMenu()
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Edit3 className="h-4 w-4" />
          <span>Edit Message</span>
        </button>
      )}

      {!message.isDeletedForEveryone && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Copy className="h-4 w-4" />
          <span>Copy Text</span>
        </button>
      )}

      {!message.isDeletedForEveryone && (
        <button
          onClick={() => {
            togglePin.mutate({ messageId: message._id })
            closeMenu()
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Pin className="h-4 w-4" />
          <span>{isPinned ? "Unpin Message" : "Pin Message"}</span>
        </button>
      )}

      {!message.isDeletedForEveryone && (
        <button
          onClick={() => {
            toggleStar.mutate({ messageId: message._id })
            closeMenu()
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Star className="h-4 w-4" />
          <span>{isStarred ? "Unstar Message" : "Star Message"}</span>
        </button>
      )}

      <button
        onClick={() => {
          onOpenInfo()
          closeMenu()
        }}
        className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
      >
        <Info className="h-4 w-4" />
        <span>Message Info</span>
      </button>

      <button
        onClick={() => {
          setSelectionMode(true)
          toggleSelectMessage(message._id)
          closeMenu()
        }}
        className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
      >
        <CheckSquare className="h-4 w-4" />
        <span>Select Messages</span>
      </button>

      {message.fileMeta?.url && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Download Attachment</span>
        </button>
      )}

      <div className="h-px bg-gray-50 my-1" />

      {/* Delete Operations */}
      <button
        onClick={() => {
          deleteForMe.mutate({ messageId: message._id })
          closeMenu()
        }}
        className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-red-50 text-red-500 rounded-xl transition-all text-left cursor-pointer"
      >
        <Trash className="h-4 w-4" />
        <span>Delete for Me</span>
      </button>

      {canEditOrDeleteForEveryone && (
        <button
          onClick={() => {
            deleteForEveryone.mutate({ messageId: message._id })
            closeMenu()
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs font-bold hover:bg-red-50 text-red-500 rounded-xl transition-all text-left cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete for Everyone</span>
        </button>
      )}
    </div>
  )
}
