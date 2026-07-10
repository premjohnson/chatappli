import { useState } from "react"
import { useSearchUsers } from "../../users/hooks/useSearchUsers"
import { useCreatePrivateConversation } from "../../conversation/hooks/useCreatePrivateConversation"
import { useCreateGroupConversation } from "../../conversation/hooks/useCreateGroupConversation"
import { useChatStore } from "../../../store/chat.store"
import type { User } from "../../users/types/user.types"
import { Modal } from "../../../components/ui/Modal"
import { Input } from "../../../components/ui/Input"
import { Button } from "../../../components/ui/Button"
import { Search, Check, Users, MessageSquare, Image, X } from "lucide-react"
import { cn } from "../../../utils/cn"

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewConversationModal({
  isOpen,
  onClose
}: NewConversationModalProps) {
  const [activeTab, setActiveTab] = useState<"dm" | "group">("dm")
  const [searchQuery, setSearchQuery] = useState("")
  
  // DM state
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Group state
  const [groupName, setGroupName] = useState("")
  const [groupAbout, setGroupAbout] = useState("")
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  const { data: searchResults = [], isLoading: usersLoading } = useSearchUsers(searchQuery)
  const { mutate: createPrivateChat, isPending: isCreatingPrivate } = useCreatePrivateConversation()
  const { mutate: createGroupChat, isPending: isCreatingGroup } = useCreateGroupConversation()
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)

  const handleSelectUser = (user: User) => {
    if (activeTab === "dm") {
      setSelectedUser(user)
    } else {
      setSelectedUsers((prev) => {
        const exists = prev.some((u) => u._id === user._id)
        if (exists) {
          return prev.filter((u) => u._id !== user._id)
        } else {
          return [...prev, user]
        }
      })
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setGroupAvatar(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateConversation = async () => {
    if (activeTab === "dm") {
      if (!selectedUser) return
      createPrivateChat(
        { targetUserId: selectedUser._id },
        {
          onSuccess: (conversation) => {
            setActiveConversation(conversation._id as string)
            handleClose()
          }
        }
      )
    } else {
      if (!groupName.trim() || selectedUsers.length === 0) return
      createGroupChat(
        {
          groupName: groupName.trim(),
          groupAbout: groupAbout.trim() || undefined,
          members: selectedUsers.map((u) => u._id),
          avatar: groupAvatar || undefined
        },
        {
          onSuccess: (conversation) => {
            setActiveConversation(conversation._id as string)
            handleClose()
          }
        }
      )
    }
  }

  const handleClose = () => {
    setSearchQuery("")
    setSelectedUser(null)
    setGroupName("")
    setGroupAbout("")
    setGroupAvatar(null)
    setAvatarPreview("")
    setSelectedUsers([])
    onClose()
  }

  const isPending = isCreatingPrivate || isCreatingGroup

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="New Session"
      className="max-w-md"
    >
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50">
          <button
            onClick={() => setActiveTab("dm")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all",
              activeTab === "dm"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Direct Message
          </button>
          <button
            onClick={() => setActiveTab("group")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all",
              activeTab === "group"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Users className="h-4 w-4" />
            New Group
          </button>
        </div>

        {/* Group Metadata Form */}
        {activeTab === "group" && (
          <div className="space-y-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Image className="h-6 w-6 text-brand-primary/40" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isPending}
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-700">Group Avatar</p>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">Click the preview box to upload a photo.</p>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Group Name (required)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={isPending}
                className="bg-white"
              />
              <Input
                placeholder="Group Description (optional)"
                value={groupAbout}
                onChange={(e) => setGroupAbout(e.target.value)}
                disabled={isPending}
                className="bg-white"
              />
            </div>
          </div>
        )}

        {/* Selected Users Chips for Group */}
        {activeTab === "group" && selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto custom-scrollbar p-1">
            {selectedUsers.map((u) => (
              <div
                key={u._id}
                className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[11px] font-bold rounded-lg"
              >
                <span>{u.username}</span>
                <button
                  onClick={() => handleSelectUser(u)}
                  className="text-brand-primary/60 hover:text-brand-primary rounded-full p-0.5"
                  disabled={isPending}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* User Search & Selection */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block px-1">
            {activeTab === "dm" ? "Select Recipient" : "Select Members"}
          </label>
          <Input
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={usersLoading || isPending}
            icon={<Search className="h-5 w-5" />}
          />

          <div className="max-h-[220px] overflow-y-auto custom-scrollbar pr-1 space-y-2">
            {searchQuery.length < 2 ? (
              <div className="text-center py-8 px-4">
                <p className="text-gray-400 text-xs font-semibold">
                  Enter at least 2 characters to search...
                </p>
              </div>
            ) : usersLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-6 h-6 border-2 border-brand-primary/20 border-t-brand-primary animate-spin rounded-full" />
                <p className="text-xs text-gray-500 font-semibold">Finding users...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-gray-400 text-xs font-semibold">
                  No users found for "{searchQuery}"
                </p>
              </div>
            ) : (
              searchResults.map((user) => {
                const isSelected = activeTab === "dm"
                  ? selectedUser?._id === user._id
                  : selectedUsers.some((u) => u._id === user._id)

                return (
                  <button
                    key={user._id}
                    onClick={() => handleSelectUser(user)}
                    disabled={isPending}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-200 text-left group",
                      isSelected
                        ? "bg-brand-primary/10 ring-1 ring-brand-primary/30"
                        : "hover:bg-brand-primary/5"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/5 flex items-center justify-center overflow-hidden border border-brand-primary/10 shrink-0">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-brand-primary">{user.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate tracking-tight text-[13px]">{user.username}</p>
                      <p className="text-[10px] text-gray-500 truncate font-semibold">{user.email || 'No email provided'}</p>
                    </div>

                    {isSelected && (
                      <div className="w-5.5 h-5.5 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-sm shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateConversation}
            disabled={
              isPending ||
              (activeTab === "dm" && !selectedUser) ||
              (activeTab === "group" && (!groupName.trim() || selectedUsers.length === 0))
            }
            isLoading={isPending}
            className="flex-1 bg-brand-primary text-white"
          >
            {activeTab === "dm" ? "Start Chat" : "Create Group"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
