import { useMyConversations } from "../hooks/useMyConversations"
import { useChatStore } from "../../../store/chat.store"
import ConversationItem from "./ConversationItem"

export default function ConversationList() {

  const { data, isLoading } = useMyConversations()
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)

  // ✅ Simplified: Just set active conversation
  // Mark-as-read is handled by ChatWindow with proper idempotency guards
  const handleSelectConversation = (conversationId: string) => {
    setActiveConversation(conversationId)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const conversations = data ?? []
  if (!Array.isArray(conversations)) return null

  if (conversations.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-6 text-sm">
        No conversations yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col">

      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation._id}
          conversation={conversation}
          isActive={activeConversationId === conversation._id}
          onSelect={handleSelectConversation}
        />
      ))}

    </div>
  )
}