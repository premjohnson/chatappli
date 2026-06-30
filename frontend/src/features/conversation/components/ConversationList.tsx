import { useMyConversations } from "../hooks/useMyConversations"
import { useChatStore } from "../../../store/chat.store"
import { useAuthStore } from "../../../store/auth.store"
import { isParticipantCurrentUser } from "../types/conversation.types"
import ConversationItem from "./ConversationItem"

interface ConversationListProps {
  searchQuery?: string
}

export default function ConversationList({ searchQuery = "" }: ConversationListProps) {
  const { data, isLoading } = useMyConversations()
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const currentUser = useAuthStore((s) => s.user)

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

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    if (c.type === "group") {
      return c.groupName?.toLowerCase().includes(query)
    }
    const receiver = c.participants.find((p) => !isParticipantCurrentUser(p, currentUser?.id))
    const receiverUsername = receiver?.username || (receiver?.user as any)?.username || ""
    return receiverUsername.toLowerCase().includes(query)
  })

  if (filteredConversations.length === 0) {
    return (
      <div className="text-center py-8 px-4 flex flex-col items-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-gray-900/5 flex items-center justify-center mb-3">
          <span className="text-gray-400 text-lg">💬</span>
        </div>
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">No chats found</p>
        <p className="text-[11px] text-gray-400 mt-1 max-w-[180px] leading-relaxed font-semibold">
          {searchQuery ? "Try searching for a different username." : "Start a new workspace session to begin."}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {filteredConversations.map((conversation) => (
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