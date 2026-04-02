import { useState } from "react"
import { useSearchUsers } from "../../users/hooks/useSearchUsers"
import { useCreatePrivateConversation } from "../../conversation/hooks/useCreatePrivateConversation"
import { useChatStore } from "../../../store/chat.store"
import type { User } from "../../users/types/user.types"

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

  const handleSelectUser = (user: User) => {
    setSelectedUser(user)
  }

  const handleCreateConversation = async () => {
    if (!selectedUser) return

    createConversation(
      { targetUserId: selectedUser._id },
      {
        onSuccess: (conversation) => {
          // Set the newly created conversation as active
          setActiveConversation(conversation._id as string)

          // Reset modal state and close
          setSearchQuery("")
          setSelectedUser(null)
          onClose()
        }
      }
    )
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 backdrop-blur-md bg-black/30 z-40 transition-opacity"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none"
        }}
      />

      {/* Modal - Glass Morphism */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-2xl bg-white/70 backdrop-blur-xl border border-white/30 p-6"
        style={{
          boxShadow: "0 20px 60px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5)"
        }}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Start New Conversation
          </h2>
          
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search users by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={usersLoading || isCreating}
            className="w-full px-4 py-2 rounded-lg bg-white/40 backdrop-blur-sm border border-white/30 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/60 focus:border-white/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Users List */}
        <div className="mb-6 max-h-72 overflow-y-auto space-y-2">
          {searchQuery.length < 2 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">
                Type at least 2 characters to search users
              </p>
            </div>
          ) : usersLoading ? (
            <div className="flex justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
                <p className="text-sm text-gray-600">Searching users...</p>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                No users found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            searchResults.map((user) => (
              <button
                key={user._id}
                onClick={() => handleSelectUser(user)}
                disabled={isCreating}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-lg
                  transition-all duration-200
                  text-left
                  ${selectedUser?._id === user._id
                    ? "bg-blue-400/30 border border-blue-400/50 backdrop-blur-sm"
                    : "bg-white/20 border border-white/30 hover:bg-white/30 hover:border-white/40 backdrop-blur-sm"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {/* Avatar */}
                {user.avatar && (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
                  />
                )}

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {user.username}
                  </p>
                  {user.email && (
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  )}
                </div>

                {/* Selection Indicator */}
                {selectedUser?._id === user._id && (
                  <div className="flex-shrink-0 text-blue-500">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 px-4 py-2 rounded-lg bg-white/30 backdrop-blur-sm border border-white/30 text-gray-900 font-medium hover:bg-white/40 hover:border-white/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateConversation}
            disabled={!selectedUser || isCreating}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-500/80 backdrop-blur-sm border border-blue-400/50 text-white font-medium hover:bg-blue-600/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                </div>
                Creating...
              </>
            ) : (
              "Start Chat"
            )}
          </button>
        </div>
      </div>
    </>
  )
}
