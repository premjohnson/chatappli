import { useChatStore } from "../../../store/chat.store"
import { useAuthStore } from "../../../store/auth.store"
import ChatHeader from "./ChatHeader"
import MessageList from "../../message/components/MessageList"
import MessageInput from "../../message/components/MessageInput"
import UserInfoPanel from "./UserInfoPanel"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import { markAsReadApi } from "../../message/api/markAsRead.api"
import { joinConversationRoom, leaveConversationRoom } from "../../../lib/socket"
import { useEffect, useRef, useState } from "react"
import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"

export default function ChatWindow() {

  // ✅ Single selector to prevent multiple re-renders from separate subscriptions
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const presenceMap = useChatStore((s) => s.presenceMap)

  const currentUser = useAuthStore((s) => s.user)
  const { data: conversations } = useMyConversations()

  const [showUserInfo, setShowUserInfo] = useState(false)

  const currentConvo = conversations?.find((c: Conversation) => c._id === activeConversationId)

  // For private chats, find the other participant
  const receiver = currentConvo?.participants.find(
    (p: ConversationParticipant) => p._id !== currentUser?.id
  )

  const receiverId = receiver?._id || ""
  const isOnline = presenceMap[receiverId] || false

  // Use ref to track which conversations we've already marked as read
  const markedConvosRef = useRef<Set<string>>(new Set())

  // Join conversation room when active conversation changes and mark as read
  useEffect(() => {
    if (activeConversationId) {
      joinConversationRoom(activeConversationId)

      // Mark as read if not already done
      if (!markedConvosRef.current.has(activeConversationId)) {
        markedConvosRef.current.add(activeConversationId)
        markAsReadApi(activeConversationId).catch((e) => console.error(e))
      }

      return () => {
        leaveConversationRoom(activeConversationId)
      }
    }
  }, [activeConversationId])

  return (
    <div
      className="flex flex-col flex-1 h-full bg-white/60 backdrop-blur-xl rounded-2xl relative overflow-hidden border border-white/50"
      style={{
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.05)"
      }}
    >

      {activeConversationId ? (
        <>
          {/* Header - Now using separate ChatHeader component */}
          <ChatHeader
            conversationId={activeConversationId}
            onOpenUserInfo={() => setShowUserInfo(true)}
          />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <MessageList conversationId={activeConversationId} />
          </div>

          {/* Input */}
          <div className="p-4 mt-auto">
            <MessageInput conversationId={activeConversationId} />
          </div>

          {/* User Info Panel - Rendered at ChatWindow level for proper positioning */}
          {showUserInfo && receiver && (
            <UserInfoPanel
              participant={receiver}
              isOnline={isOnline}
              onClose={() => setShowUserInfo(false)}
            />
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 font-medium">
          Select a conversation to start chatting.
        </div>
      )}

    </div>
  )
}