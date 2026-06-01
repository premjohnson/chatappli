import { useState } from "react"
import { useSearchUsers } from "../../users/hooks/useSearchUsers"
import { useCreatePrivateConversation } from "../../conversation/hooks/useCreatePrivateConversation"
import { useChatStore } from "../../../store/chat.store"
import type { User } from "../../users/types/user.types"
import { Modal } from "../../../components/ui/Modal"
import { Input } from "../../../components/ui/Input"
import { Button } from "../../../components/ui/Button"
import { Search, Check } from "lucide-react"
import { cn } from "../../../utils/cn"

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewConversationModal({
  isOpen,
  onClose
}: NewConversationModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const { data: searchResults = [], isLoading: usersLoading } = useSearchUsers(searchQuery)
  const { mutate: createConversation, isPending: isCreating } = useCreatePrivateConversation()
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)

  const handleSelectUser = (user: User) => setSelectedUser(user)

  const handleCreateConversation = async () => {
    if (!selectedUser) return
    createConversation(
      { targetUserId: selectedUser._id },
      {
        onSuccess: (conversation) => {
          setActiveConversation(conversation._id as string)
          setSearchQuery("")
          setSelectedUser(null)
          onClose()
        }
      }
    )
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="New Conversation"
      className="max-w-md"
    >
      <div className="space-y-6">
        <Input
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={usersLoading || isCreating}
          icon={<Search className="h-5 w-5" />}
        />

        <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-1 space-y-2">
          {searchQuery.length < 2 ? (
            <div className="text-center py-10 px-4">
              <p className="text-gray-400 text-sm font-medium">
                Enter at least 2 characters to find someone...
              </p>
            </div>
          ) : usersLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-3 border-brand-primary/20 border-t-brand-primary animate-spin rounded-full" />
              <p className="text-sm text-gray-500 font-medium">Finding users...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-gray-400 text-sm font-medium">
                No users found for "{searchQuery}"
              </p>
            </div>
          ) : (
            searchResults.map((user) => (
              <button
                key={user._id}
                onClick={() => handleSelectUser(user)}
                disabled={isCreating}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left group",
                  selectedUser?._id === user._id
                    ? "bg-brand-primary/10 ring-1 ring-brand-primary/30"
                    : "hover:bg-brand-primary/5"
                )}
              >
                <div className="w-11 h-11 rounded-xl bg-brand-primary/5 flex items-center justify-center overflow-hidden border border-brand-primary/10">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-brand-primary">{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate tracking-tight">{user.username}</p>
                  <p className="text-xs text-gray-500 truncate font-medium">{user.email || 'No email provided'}</p>
                </div>

                {selectedUser?._id === user._id && (
                  <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-sm">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isCreating}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateConversation}
            disabled={!selectedUser || isCreating}
            isLoading={isCreating}
            className="flex-1"
          >
            Start Chat
          </Button>
        </div>
      </div>
    </Modal>
  )
}
