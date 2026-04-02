import { useMemo } from "react"
import type { ConversationParticipant } from "../../conversation/types/conversation.types"

interface UserInfoPanelProps {
  participant: ConversationParticipant
  isOnline: boolean
  onClose: () => void
}

export default function UserInfoPanel({
  participant,
  isOnline,
  onClose
}: UserInfoPanelProps) {
  const user: any = participant;

  // Get shared media from messages (would require passing conversationId)
  // For now, we'll show basic user info
  const sharedMedia = useMemo(() => {
    // In a full implementation, you'd fetch and filter messages with attachments
    return []
  }, [])

  return (
    <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm">
      <div
        className="absolute right-0 top-0 h-full w-full max-w-sm bg-white/90 backdrop-blur-xl shadow-2xl flex flex-col border-l border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">User Info</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Avatar and Status */}
          <div className="p-6 text-center border-b border-gray-100">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  user?.username?.charAt(0).toUpperCase() || "?"
                )}
              </div>

              {/* Online status indicator */}
              <div
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${isOnline ? "bg-emerald-500" : "bg-gray-400"
                  }`}
              />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-gray-800">
              {user?.username || "Unknown User"}
            </h3>

            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${isOnline
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-600"
              }`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          {/* User Info */}
          <div className="p-6 space-y-4 border-b border-gray-100">
            {/* Email */}
            {user?.email && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Email
                </p>
                <a
                  href={`mailto:${user.email}`}
                  className="text-sm text-blue-600 hover:text-blue-700 break-all"
                >
                  {user.email}
                </a>
              </div>
            )}

            {/* Role in conversation */}
            {participant.role && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Role
                </p>
                <p className="text-sm text-gray-700 capitalize">
                  {participant.role}
                </p>
              </div>
            )}
          </div>

          {/* Shared Media Section */}
          {sharedMedia.length > 0 && (
            <div className="p-6 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Shared Media
              </p>
              <div className="grid grid-cols-3 gap-2">
                {sharedMedia.map((media: any, index: number) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg bg-gray-200 overflow-hidden flex items-center justify-center"
                  >
                    {media.type?.startsWith("image/") ? (
                      <img
                        src={media.data}
                        alt={media.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">📎</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {sharedMedia.length === 0 && (
            <div className="p-6 text-center text-gray-400">
              <p className="text-sm">No shared media yet</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button className="w-full px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 font-medium text-sm transition-colors">
            View Profile
          </button>
          <button className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm transition-colors">
            Block User
          </button>
        </div>
      </div>
    </div>
  )
}
