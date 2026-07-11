import { useState, useMemo, useEffect } from "react"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { useAuthStore } from "../../../store/auth.store"
import { useChatStore } from "../../../store/chat.store"
import { useSearchUsers } from "../../users/hooks/useSearchUsers"
import type { Conversation, ConversationParticipant, InviteLinkOptions } from "../../conversation/types/conversation.types"
import { isParticipantCurrentUser } from "../../conversation/types/conversation.types"
import { addParticipantApi } from "../../conversation/api/addParticipant.api"
import { removeParticipantApi } from "../../conversation/api/removeParticipant.api"
import { promoteAdminApi } from "../../conversation/api/promoteAdmin.api"
import { demoteAdminApi } from "../../conversation/api/demoteAdmin.api"
import { transferOwnershipApi } from "../../conversation/api/transferOwnership.api"
import { updateGroupSettingsApi } from "../../conversation/api/updateGroupSettings.api"
import { updateGroupInfoApi } from "../../conversation/api/updateGroupInfo.api"
import { generateInviteLinkApi } from "../../conversation/api/generateInviteLink.api"
import { revokeInviteLinkApi } from "../../conversation/api/revokeInviteLink.api"
import { handleJoinRequestApi } from "../../conversation/api/handleJoinRequest.api"
import { useMessages } from "../../message/hooks/useMessages"
import { decryptedCache } from "../../../utils/decryptedCache"
import { muteConversationApi } from "../../conversation/api/muteConversation.api"
import { useGroupDevices } from "../../device/hooks/useGroupDevices"
import { motion, AnimatePresence } from "framer-motion"
import { X, Shield, Plus, Trash2, LogOut, Edit3, Save, Image, Check, Search, ChevronDown, Crown, ShieldAlert, UserCheck, Link, Copy, RefreshCw, VolumeX, Volume2 } from "lucide-react"
import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { cn } from "../../../utils/cn"

interface GroupInfoPanelProps {
  conversation: Conversation
  onClose: () => void
}

export default function GroupInfoPanel({
  conversation,
  onClose
}: GroupInfoPanelProps) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const presenceMap = useChatStore((s) => s.presenceMap)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)

  // Edit Mode
  const [isEditing, setIsEditing] = useState(false)
  const [groupName, setGroupName] = useState(conversation.groupName || "")
  const [groupAbout, setGroupAbout] = useState(conversation.groupAbout || "")
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>("")

  // Add Member Mode
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { data: searchResults = [], isLoading: searchLoading } = useSearchUsers(searchQuery)

  // Role Checks
  const myParticipant = useMemo(() => 
    conversation.participants.find((p) => isParticipantCurrentUser(p, currentUser?.id)),
    [conversation.participants, currentUser?.id]
  )
  const isOwner = myParticipant?.role === "owner"
  const isAdmin = myParticipant?.role === "admin" || isOwner

  // Mutations
  const updateGroupMutation = useMutation({
    mutationFn: (data: { groupName?: string; groupAbout?: string; avatar?: File; removeAvatar?: boolean }) => 
      updateGroupInfoApi(conversation._id, data),
    onSuccess: (updatedConvo) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => (c._id === conversation._id ? { ...c, ...updatedConvo } : c))
      })
      setIsEditing(false)
      setGroupAvatar(null)
    }
  })

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => addParticipantApi(conversation._id, userId),
    onSuccess: (updatedConvo) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => (c._id === conversation._id ? { ...c, ...updatedConvo } : c))
      })
      setIsAddingMember(false)
      setSearchQuery("")
    }
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeParticipantApi(conversation._id, userId),
    onSuccess: (updatedConvo, userId) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => (c._id === conversation._id ? { ...c, ...updatedConvo } : c))
      })
      // If removed self, close chat
      if (userId === currentUser?.id) {
        setActiveConversation(null)
        onClose()
      }
    }
  })

  const promoteAdminMutation = useMutation({
    mutationFn: (userId: string) => promoteAdminApi(conversation._id, userId),
    onSuccess: (updatedConvo) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => (c._id === conversation._id ? { ...c, ...updatedConvo } : c))
      })
    }
  })

  const demoteAdminMutation = useMutation({
    mutationFn: (userId: string) => demoteAdminApi(conversation._id, userId),
    onSuccess: (updatedConvo) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => (c._id === conversation._id ? { ...c, ...updatedConvo } : c))
      })
      setActiveActionMember(null)
    }
  })

  const transferOwnershipMutation = useMutation({
    mutationFn: (userId: string) => transferOwnershipApi(conversation._id, userId),
    onSuccess: (updatedConvo) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => (c._id === conversation._id ? { ...c, ...updatedConvo } : c))
      })
      setActiveActionMember(null)
    }
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) => updateGroupSettingsApi(conversation._id, settings),
    onSuccess: (updatedConvo) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => (c._id === conversation._id ? { ...c, ...updatedConvo } : c))
      })
    }
  })

  const generateInviteMutation = useMutation({
    mutationFn: (options?: InviteLinkOptions) => generateInviteLinkApi(conversation._id, options),
    onSuccess: (newLink) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => {
          if (c._id === conversation._id) {
            const links = c.inviteLinks ? [...c.inviteLinks] : []
            links.forEach((l: any) => { l.isActive = false })
            links.push(newLink)
            return { ...c, inviteLinks: links }
          }
          return c
        })
      })
    }
  })

  const revokeInviteMutation = useMutation({
    mutationFn: (code: string) => revokeInviteLinkApi(conversation._id, code),
    onSuccess: (updatedConvo) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => (c._id === conversation._id ? { ...c, ...updatedConvo } : c))
      })
    }
  })

  const handleRequestMutation = useMutation({
    mutationFn: (data: { requesterId: string; action: "approve" | "reject" }) =>
      handleJoinRequestApi(conversation._id, data.requesterId, data.action),
    onSuccess: (updatedConvo) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => (c._id === conversation._id ? { ...c, ...updatedConvo } : c))
      })
    }
  })

  const { data: messagesPages } = useMessages(conversation._id)
  const allMessages = useMemo(() => {
    if (!messagesPages?.pages) return []
    return messagesPages.pages.flatMap((page) => page.data || [])
  }, [messagesPages])

  const userIds = useMemo(() => {
    return conversation.participants.map((p) => ((p.user as any)?._id || p.user).toString())
  }, [conversation.participants])

  const { data: groupDevices = [], isError } = useGroupDevices(userIds)

  const [activeActionMember, setActiveActionMember] = useState<ConversationParticipant | null>(null)
  const [activeProfileMember, setActiveProfileMember] = useState<ConversationParticipant | null>(null)
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [showPermissions, setShowPermissions] = useState(false)
  const [showInviteLink, setShowInviteLink] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [showMediaGallery, setShowMediaGallery] = useState(false)
  const [activeMediaTab, setActiveMediaTab] = useState<"media" | "docs" | "links">("media")
  const [copied, setCopied] = useState(false)
  const [showSecurityAudit, setShowSecurityAudit] = useState(false)
  const [securityFingerprint, setSecurityFingerprint] = useState("")

  useEffect(() => {
    const keys = conversation.participants.flatMap((p) => {
      const memberId = ((p.user as any)?._id || p.user).toString()
      return groupDevices?.filter((d) => d.userId === memberId).map((d) => d.publicKey) || []
    })
    if (keys.length > 0) {
      const joined = [...keys].sort().join(":")
      const encoder = new TextEncoder()
      const data = encoder.encode(joined)
      window.crypto.subtle.digest("SHA-256", data).then((hashBuffer) => {
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
        const formatted = hashHex.toUpperCase().substring(0, 24).match(/.{4}/g)?.join(' ') || hashHex
        setSecurityFingerprint(formatted)
      }).catch(console.error)
    } else {
      setSecurityFingerprint("No active verified devices.")
    }
  }, [conversation.participants, groupDevices])

  const muteMutation = useMutation({
    mutationFn: (payload: { muteType: any; durationSeconds?: number }) =>
      muteConversationApi(conversation._id, payload),
    onSuccess: (updatedConvo) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => (c._id === conversation._id ? { ...c, ...updatedConvo } : c))
      })
      setShowMuteOptions(false)
    }
  })

  const [showMuteOptions, setShowMuteOptions] = useState(false)

  const isMuted = useMemo(() => {
    if (!myParticipant?.muteUntil) return false
    return new Date(myParticipant.muteUntil) > new Date()
  }, [myParticipant?.muteUntil])

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

  const handleSaveGroupInfo = () => {
    if (!groupName.trim()) return
    updateGroupMutation.mutate({
      groupName: groupName.trim(),
      groupAbout: groupAbout.trim(),
      avatar: groupAvatar || undefined
    })
  }

  const handleLeaveGroup = () => {
    if (confirm("Are you sure you want to leave this group?")) {
      removeMemberMutation.mutate(currentUser?.id as string)
    }
  }

  const createdByName = useMemo(() => {
    if (!conversation.createdBy) return "Unknown"
    const creator = conversation.createdBy as any
    return creator.username || "Unknown"
  }, [conversation.createdBy])

  const createdDateStr = useMemo(() => {
    if (!conversation.createdAt) return ""
    return new Date(conversation.createdAt).toLocaleDateString()
  }, [conversation.createdAt])

  const onlineMembersCount = useMemo(() => {
    return conversation.participants.filter((p) => {
      const u = p.user as any
      const memberId = (u?._id || p.user).toString()
      return memberId === currentUser?.id || presenceMap[memberId] || false
    }).length
  }, [conversation.participants, presenceMap, currentUser?.id])

  const sortedParticipants = useMemo(() => {
    return [...conversation.participants].sort((a, b) => {
      const roles = { owner: 0, admin: 1, member: 2 }
      const roleA = roles[a.role as keyof typeof roles] ?? 2
      const roleB = roles[b.role as keyof typeof roles] ?? 2
      if (roleA !== roleB) return roleA - roleB
      const userA = (a.user as any)?.username || a.username || ""
      const userB = (b.user as any)?.username || b.username || ""
      return userA.localeCompare(userB)
    })
  }, [conversation.participants])

  return (
    <div className="absolute inset-0 z-50 overflow-hidden pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/5 backdrop-blur-[2px] pointer-events-auto"
      />
      
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute right-0 top-0 h-full w-full max-w-[340px] bg-white/70 border-l border-white/20 shadow-premium pointer-events-auto flex flex-col backdrop-blur-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 select-none">
          <h2 className="font-bold text-gray-900 tracking-tight text-lg">Group Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 text-gray-400 hover:text-gray-900">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {/* Group Avatar and Metadata */}
          <div className="p-8 text-center flex flex-col items-center select-none border-b border-white/10 bg-white/10">
            {isEditing ? (
              <div className="relative w-24 h-24 rounded-[2rem] bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 overflow-hidden mb-4 group cursor-pointer">
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" alt="Preview" />
                ) : conversation.groupAvatar?.url ? (
                  <img src={conversation.groupAvatar.url} className="w-full h-full object-cover" alt="Group" />
                ) : (
                  <Image className="h-8 w-8 text-brand-primary" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-[2rem] bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-3xl shadow-inner border border-brand-primary/20 overflow-hidden mb-4">
                {conversation.groupAvatar?.url ? (
                  <img src={conversation.groupAvatar.url} className="w-full h-full object-cover" alt="Group" />
                ) : (
                  conversation.groupName?.charAt(0).toUpperCase()
                )}
              </div>
            )}

            {isEditing ? (
              <div className="w-full space-y-3 mt-2">
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group Name"
                  className="text-center font-bold"
                  disabled={updateGroupMutation.isPending}
                />
                <Input
                  value={groupAbout}
                  onChange={(e) => setGroupAbout(e.target.value)}
                  placeholder="Group Description"
                  className="text-center text-xs text-gray-500"
                  disabled={updateGroupMutation.isPending}
                />
                <div className="flex flex-col gap-2 items-center pt-1">
                  {(avatarPreview || conversation.groupAvatar?.url) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Remove group avatar?")) {
                          updateGroupMutation.mutate({ removeAvatar: true }, {
                            onSuccess: () => {
                              setAvatarPreview("")
                              setGroupAvatar(null)
                            }
                          })
                        }
                      }}
                      disabled={updateGroupMutation.isPending}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 text-[10px] font-bold py-1 h-7"
                    >
                      Remove Avatar
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false)
                        setAvatarPreview("")
                      }}
                      disabled={updateGroupMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveGroupInfo}
                      isLoading={updateGroupMutation.isPending}
                      className="gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
                    {conversation.groupName}
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 font-medium max-w-[220px]">
                  {conversation.groupAbout || "No description provided."}
                </p>
                <div className="mt-4 flex flex-col gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <div>Created by: <span className="text-gray-600 normal-case">{createdByName}</span></div>
                  <div>Created date: <span className="text-gray-600 normal-case">{createdDateStr}</span></div>
                  <div>Online: <span className="text-emerald-600 normal-case">{onlineMembersCount} of {conversation.participants.length}</span></div>
                </div>
              </>
            )}
          </div>

          {/* Mute Notifications Toggle */}
          <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between select-none">
            <span className="text-xs font-bold text-gray-700">Mute Notifications</span>
            {isMuted ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => muteMutation.mutate({ muteType: "unmute" })}
                disabled={muteMutation.isPending}
                className="h-7 px-2.5 gap-1.5 text-xs text-red-500 hover:bg-red-50"
              >
                <VolumeX className="h-4 w-4" />
                Muted
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowMuteOptions(true)}
                disabled={muteMutation.isPending}
                className="h-7 px-2.5 gap-1.5 text-xs text-gray-500 hover:bg-gray-50"
              >
                <Volume2 className="h-4 w-4" />
                Mute
              </Button>
            )}
          </div>

          {/* Permissions Section */}
          <div className="border-b border-white/10 px-6 py-4">
            <button
              onClick={() => setShowPermissions(!showPermissions)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 select-none hover:text-gray-600 transition-colors"
            >
              <span>Group Permissions</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showPermissions && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showPermissions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-4 space-y-3.5"
                >
                  {[
                    { key: "onlyAdminsCanSend", label: "Only Admins Can Send Messages" },
                    { key: "onlyAdminsCanEditInfo", label: "Only Admins Can Edit Group Info" },
                    { key: "onlyAdminsCanAddMembers", label: "Only Admins Can Add Members" },
                    { key: "onlyAdminsCanRemoveMembers", label: "Only Admins Can Remove Members" },
                    { key: "onlyAdminsCanPinMessages", label: "Only Admins Can Pin Messages" },
                    { key: "memberApprovalsEnabled", label: "Require Admin Approval to Join" }
                  ].map((item) => {
                    const val = (conversation.groupSettings as any)?.[item.key] ?? false
                    return (
                      <div key={item.key} className="flex items-center justify-between gap-3 p-1">
                        <span className="text-xs text-gray-700 font-bold leading-snug">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={val}
                          disabled={!isAdmin || updateSettingsMutation.isPending}
                          onChange={(e) => {
                            updateSettingsMutation.mutate({ [item.key]: e.target.checked })
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary shrink-0 cursor-pointer disabled:cursor-default"
                        />
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Invite Link Section */}
          <div className="border-b border-white/10 px-6 py-4">
            <button
              onClick={() => setShowInviteLink(!showInviteLink)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 select-none hover:text-gray-600 transition-colors"
            >
              <span>Invite Link</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showInviteLink && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showInviteLink && (() => {
                const activeInvite = conversation.inviteLinks?.find((l: any) => l.isActive)
                const inviteUrl = activeInvite ? `${window.location.origin}/invite/${activeInvite.code}` : ""

                return (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 space-y-4"
                  >
                    {activeInvite ? (
                      <div className="space-y-4 text-center">
                        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-semibold text-gray-600 select-all truncate">
                          <Link className="h-4 w-4 shrink-0 text-brand-primary" />
                          <span className="truncate flex-1 text-left">{inviteUrl}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(inviteUrl)
                              setCopied(true)
                              setTimeout(() => setCopied(false), 2000)
                            }}
                            className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                            title="Copy link"
                          >
                            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>

                        {/* QR Code */}
                        <div className="space-y-1">
                          <img
                            src={`https://chart.googleapis.com/chart?cht=qr&chs=150x150&chl=${encodeURIComponent(inviteUrl)}`}
                            alt="QR Code"
                            className="w-32 h-32 mx-auto border border-gray-100 rounded-2xl p-2 bg-white"
                          />
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Scan QR code to join</p>
                        </div>

                        {isAdmin && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateInviteMutation.mutate(undefined)}
                              disabled={generateInviteMutation.isPending}
                              className="flex-1 justify-center gap-1.5 h-8 text-[10px] font-black uppercase tracking-wider"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Reset Link
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => revokeInviteMutation.mutate(activeInvite.code)}
                              disabled={revokeInviteMutation.isPending}
                              className="flex-1 justify-center gap-1.5 h-8 text-[10px] font-black uppercase tracking-wider text-red-500 border-red-500/20 hover:bg-red-50"
                            >
                              <X className="h-3 w-3" />
                              Revoke Link
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 space-y-3">
                        <p className="text-xs text-gray-400 font-medium">No active invite link exists for this group.</p>
                        {isAdmin && (
                          <Button
                            size="sm"
                            onClick={() => generateInviteMutation.mutate(undefined)}
                            disabled={generateInviteMutation.isPending}
                            className="mx-auto gap-1.5 h-9 text-xs font-bold"
                          >
                            <Plus className="h-4 w-4" />
                            Create Invite Link
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })()}
            </AnimatePresence>
          </div>

          {/* Join Requests Section (Admins Only) */}
          {isAdmin && (
            <div className="border-b border-white/10 px-6 py-4">
              <button
                onClick={() => setShowRequests(!showRequests)}
                className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 select-none hover:text-gray-600 transition-colors"
              >
                <span>Join Requests ({conversation.joinRequests?.length || 0})</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showRequests && "rotate-180")} />
              </button>

              <AnimatePresence>
                {showRequests && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 space-y-3.5"
                  >
                    {!conversation.joinRequests || conversation.joinRequests.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2 font-medium">No pending requests.</p>
                    ) : (
                      conversation.joinRequests.map((req: any) => {
                        const u = req.user
                        const memberId = u?._id || u
                        const username = u?.username || "Pending User"
                        const avatar = u?.avatar || ""
                        const requestedDate = req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : ""

                        return (
                          <div key={memberId} className="flex items-center justify-between p-2 rounded-2xl bg-gray-50 border border-gray-100 gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-brand-primary/5 flex items-center justify-center text-brand-primary font-bold text-xs overflow-hidden shrink-0">
                                {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : username.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate leading-snug">{username}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase leading-none">{requestedDate}</p>
                              </div>
                            </div>

                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => handleRequestMutation.mutate({ requesterId: memberId, action: "approve" })}
                                disabled={handleRequestMutation.isPending}
                                className="h-6 px-2.5 text-[9px] font-black uppercase tracking-wider rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRequestMutation.mutate({ requesterId: memberId, action: "reject" })}
                                disabled={handleRequestMutation.isPending}
                                className="h-6 px-2.5 text-[9px] font-black uppercase tracking-wider rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Media, Links & Docs Section */}
          <div className="border-b border-white/10 px-6 py-4">
            <button
              onClick={() => setShowMediaGallery(!showMediaGallery)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 select-none hover:text-gray-600 transition-colors"
            >
              <span>Media, Links & Docs</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showMediaGallery && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showMediaGallery && (() => {
                const mediaMessages = allMessages.filter((msg: any) => msg.type === "image" || msg.fileMeta?.mimeType?.startsWith("image/"))
                const docMessages = allMessages.filter((msg: any) => msg.type === "file" || (msg.fileMeta && !msg.fileMeta.mimeType?.startsWith("image/")))
                
                const linkMessages = allMessages.filter((msg: any) => {
                  const txt = decryptedCache.get(msg._id) || ""
                  return txt.includes("http://") || txt.includes("https://")
                })

                return (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 space-y-4"
                  >
                    {/* Tab Selectors */}
                    <div className="flex bg-gray-100 rounded-xl p-1 text-[10px] font-black uppercase tracking-wider select-none">
                      {[
                        { key: "media", label: `Media (${mediaMessages.length})` },
                        { key: "docs", label: `Docs (${docMessages.length})` },
                        { key: "links", label: `Links (${linkMessages.length})` }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveMediaTab(tab.key as any)}
                          className={cn(
                            "flex-1 text-center py-1.5 rounded-lg transition-all cursor-pointer",
                            activeMediaTab === tab.key 
                              ? "bg-white text-brand-primary shadow-sm" 
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Tab Contents */}
                    <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                      {activeMediaTab === "media" && (
                        mediaMessages.length === 0 ? (
                          <p className="text-[11px] text-gray-400 text-center py-4 font-semibold">No shared media.</p>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {mediaMessages.map((msg: any) => {
                              const url = msg.fileMeta?.url || msg.encryptedContent
                              return (
                                <a
                                  key={msg._id}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-12 h-12 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center hover:scale-95 transition-transform"
                                >
                                  <img src={url} className="w-full h-full object-cover" alt="" />
                                </a>
                              )
                            })}
                          </div>
                        )
                      )}

                      {activeMediaTab === "docs" && (
                        docMessages.length === 0 ? (
                          <p className="text-[11px] text-gray-400 text-center py-4 font-semibold">No shared documents.</p>
                        ) : (
                          <div className="space-y-2">
                            {docMessages.map((msg: any) => {
                              const name = msg.fileMeta?.fileName || "Document"
                              const size = msg.fileMeta?.size ? `${(msg.fileMeta.size / 1024).toFixed(1)} KB` : ""
                              const url = msg.fileMeta?.url
                              return (
                                <a
                                  key={msg._id}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors gap-2"
                                >
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-gray-800 truncate">{name}</p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase">{size}</p>
                                  </div>
                                  <Link className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                </a>
                              )
                            })}
                          </div>
                        )
                      )}

                      {activeMediaTab === "links" && (
                        linkMessages.length === 0 ? (
                          <p className="text-[11px] text-gray-400 text-center py-4 font-semibold">No shared links.</p>
                        ) : (
                          <div className="space-y-2">
                            {linkMessages.map((msg: any) => {
                              const txt = decryptedCache.get(msg._id) || ""
                              const urlRegex = /(https?:\/\/[^\s]+)/g
                              const urls = txt.match(urlRegex) || []
                              const primaryUrl = urls[0] || ""
                              return (
                                <a
                                  key={msg._id}
                                  href={primaryUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-2 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors min-w-0"
                                >
                                  <p className="text-[11px] font-bold text-brand-primary truncate">{primaryUrl}</p>
                                  <p className="text-[9px] text-gray-400 truncate font-semibold mt-0.5">{txt}</p>
                                </a>
                              )
                            })}
                          </div>
                        )
                      )}
                    </div>
                  </motion.div>
                )
              })()}
            </AnimatePresence>
          </div>

          {/* Security Audit Section */}
          <div className="border-b border-white/10 px-6 py-4">
            <button
              onClick={() => setShowSecurityAudit(!showSecurityAudit)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 select-none hover:text-gray-600 transition-colors"
            >
              <span>Security Audit</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showSecurityAudit && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showSecurityAudit && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-4 space-y-4"
                >
                  {/* Security Fingerprint */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">E2EE Security Code</p>
                    <p className="text-sm font-mono font-black text-gray-800 tracking-widest text-center select-all">
                      {securityFingerprint || "Calculating..."}
                    </p>
                    <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                      This number confirms that messages in this group are encrypted with valid device keys. Compare this code with other members to verify absolute security.
                    </p>
                  </div>

                  {/* Device List */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Devices List</p>
                    <div className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-1.5">
                      {isError ? (
                        <p className="text-[11px] text-red-500 font-semibold text-center py-2">Error loading devices.</p>
                      ) : !groupDevices || groupDevices.length === 0 ? (
                        <p className="text-[11px] text-gray-400 font-semibold text-center py-2">No active verified devices.</p>
                      ) : (
                        groupDevices.map((device) => {
                          const participant = conversation.participants.find(
                            (p) => ((p.user as any)?._id || p.user).toString() === device.userId
                          )
                          const username = (participant?.user as any)?.username || participant?.username || "Unknown"
                          return (
                            <div key={device.deviceId} className="p-2 rounded-xl bg-white border border-gray-100 flex items-center justify-between gap-3 text-[11px]">
                              <div className="min-w-0">
                                <p className="font-bold text-gray-800 truncate">{username}'s device</p>
                                <p className="font-mono text-gray-400 text-[9px] truncate">ID: {device.deviceId}</p>
                              </div>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold uppercase tracking-tight shrink-0 text-[8px]">
                                Verified
                              </span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Members List */}
          <div className="flex-1 px-6 py-5 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-2 select-none">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Members ({conversation.participants.length})
              </span>
              {isAdmin && !isAddingMember && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAddingMember(true)}
                  className="h-6 px-1.5 gap-1 text-[10px] font-black uppercase tracking-wider text-brand-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Member
                </Button>
              )}
            </div>

            {/* Search Members Input */}
            <div className="mb-4">
              <Input
                placeholder="Search members..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="bg-gray-50/50 text-xs h-8 py-1"
                icon={<Search className="h-4 w-4" />}
              />
            </div>

            {/* Add Member Search Input */}
            {isAddingMember && (
              <div className="mb-4 space-y-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-primary">Search Users</span>
                  <button
                    onClick={() => {
                      setIsAddingMember(false)
                      setSearchQuery("")
                    }}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  placeholder="Username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={addMemberMutation.isPending}
                  className="bg-white text-xs h-9 py-1"
                  icon={<Search className="h-4 w-4" />}
                />
                <div className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-1.5">
                  {searchQuery.length < 2 ? (
                    <p className="text-[10px] text-gray-400 text-center py-2">Enter 2+ chars...</p>
                  ) : searchLoading ? (
                    <p className="text-[10px] text-gray-400 text-center py-2">Loading...</p>
                  ) : searchResults.length === 0 ? (
                    <p className="text-[10px] text-gray-400 text-center py-2">No users found.</p>
                  ) : (
                    searchResults.map((user) => {
                      const alreadyInGroup = conversation.participants.some(
                        (p) => ((p.user as any)?._id || p.user).toString() === user._id.toString()
                      )
                      return (
                        <div
                          key={user._id}
                          className="flex items-center justify-between p-1.5 hover:bg-white rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-brand-primary/5 flex items-center justify-center overflow-hidden border border-brand-primary/10">
                              {user.avatar ? (
                                <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <span className="font-bold text-[10px] text-brand-primary">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-gray-900 truncate">{user.username}</span>
                          </div>
                          {alreadyInGroup ? (
                            <span className="text-[9px] font-black uppercase text-gray-400 tracking-tight mr-1">In Group</span>
                          ) : (
                            <Button
                              size="sm"
                              disabled={addMemberMutation.isPending}
                              onClick={() => addMemberMutation.mutate(user._id)}
                              className="h-6 px-2 text-[10px] font-bold"
                            >
                              Add
                            </Button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* List of Members */}
            <div className="space-y-2 flex-1">
              {sortedParticipants.map((p) => {
                const u = p.user as any
                const memberId = (u?._id || p.user).toString()
                const username = u?.username || p.username || "Unknown"
                const avatar = u?.avatar || p.avatar || ""
                const isMe = memberId === currentUser?.id
                const isMemberOnline = isMe ? true : (presenceMap[memberId] || false)

                return (
                  <div
                    key={memberId}
                    onClick={() => {
                      if (!isMe) setActiveActionMember(p)
                    }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-2xl border border-transparent hover:bg-white/40 hover:border-white/50 transition-all group select-none",
                      !isMe && "cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm overflow-hidden">
                          {avatar ? (
                            <img src={avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            username.charAt(0).toUpperCase()
                          )}
                        </div>
                        {isMemberOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate leading-snug">
                          {username} {isMe && <span className="text-[10px] text-gray-400 font-medium">(You)</span>}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium leading-none">
                          {isMemberOnline ? "Active Now" : "Offline"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Role Badge */}
                      {p.role !== "member" && (
                        <div className={cn(
                          "px-2 py-0.5 rounded-md flex items-center gap-1 text-[9px] font-black uppercase tracking-wider select-none shrink-0",
                          p.role === "owner" 
                            ? "bg-amber-100 text-amber-700" 
                            : "bg-blue-100 text-blue-700"
                        )}>
                          <Shield className="h-3 w-3" />
                          {p.role}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white/40 border-t border-white/10 select-none">
          <Button
            variant="outline"
            onClick={handleLeaveGroup}
            disabled={removeMemberMutation.isPending}
            className="w-full justify-center gap-2.5 h-11 rounded-xl text-xs font-bold uppercase tracking-wider border-red-500/20 text-red-500 hover:bg-red-500/5 hover:border-red-500/30"
          >
            <LogOut className="h-4 w-4" />
            Leave Group
          </Button>
        </div>
      </motion.div>

      {/* Member Action Sheet Modal */}
      <AnimatePresence>
        {activeActionMember && (() => {
          const u = activeActionMember.user as any
          const memberId = u?._id || activeActionMember.user
          const username = u?.username || activeActionMember.username || "Member"

          const canPromote = isOwner && activeActionMember.role === "member"
          const canDemote = isOwner && activeActionMember.role === "admin"
          const canTransfer = isOwner && activeActionMember.role !== "owner"
          const canRemove = isOwner || (isAdmin && activeActionMember.role === "member")

          return (
            <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] pointer-events-auto p-4 select-none">
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl p-5 space-y-3"
              >
                <div className="text-center py-2">
                  <p className="font-black text-gray-900 text-sm">{username}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Member Options</p>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveProfileMember(activeActionMember)
                      setActiveActionMember(null)
                    }}
                    className="w-full flex items-center gap-3 p-3 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-2xl transition-colors"
                  >
                    <UserCheck className="h-4 w-4 text-gray-500" />
                    View Profile
                  </button>

                  {canPromote && (
                    <button
                      onClick={() => {
                        if (confirm(`Make ${username} an Admin?`)) {
                          promoteAdminMutation.mutate(memberId)
                        }
                      }}
                      disabled={promoteAdminMutation.isPending}
                      className="w-full flex items-center gap-3 p-3 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      Make Admin
                    </button>
                  )}

                  {canDemote && (
                    <button
                      onClick={() => {
                        if (confirm(`Dismiss ${username} as Admin?`)) {
                          demoteAdminMutation.mutate(memberId)
                        }
                      }}
                      disabled={demoteAdminMutation.isPending}
                      className="w-full flex items-center gap-3 p-3 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-2xl transition-colors"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Dismiss as Admin
                    </button>
                  )}

                  {canTransfer && (
                    <button
                      onClick={() => {
                        if (confirm(`Transfer Group Ownership to ${username}? You will remain an admin.`)) {
                          transferOwnershipMutation.mutate(memberId)
                        }
                      }}
                      disabled={transferOwnershipMutation.isPending}
                      className="w-full flex items-center gap-3 p-3 text-xs font-bold text-brand-primary hover:bg-brand-primary/5 rounded-2xl transition-colors"
                    >
                      <Crown className="h-4 w-4" />
                      Transfer Ownership
                    </button>
                  )}

                  {canRemove && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${username} from the group?`)) {
                          removeMemberMutation.mutate(memberId)
                          setActiveActionMember(null)
                        }
                      }}
                      disabled={removeMemberMutation.isPending}
                      className="w-full flex items-center gap-3 p-3 text-xs font-bold text-red-600 hover:bg-red-50 rounded-2xl transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove from Group
                    </button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setActiveActionMember(null)}
                  className="w-full justify-center text-xs font-bold text-gray-500 rounded-2xl h-10 border border-gray-100"
                >
                  Cancel
                </Button>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>

      {/* Member Profile Detail Modal */}
      <AnimatePresence>
        {activeProfileMember && (() => {
          const u = activeProfileMember.user as any
          const username = u?.username || activeProfileMember.username || "Member"
          const avatar = u?.avatar || activeProfileMember.avatar || ""
          const email = u?.email || "No email available"
          const joinedDate = activeProfileMember.joinedAt ? new Date(activeProfileMember.joinedAt).toLocaleDateString() : "Unknown"

          return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-auto p-4 select-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-xs bg-white rounded-3xl shadow-2xl p-6 text-center space-y-4"
              >
                <div className="w-20 h-20 rounded-[1.5rem] bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-2xl border border-brand-primary/10 overflow-hidden mx-auto shadow-inner">
                  {avatar ? (
                    <img src={avatar} className="w-full h-full object-cover" alt="" />
                  ) : (
                    username.charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <h4 className="font-black text-gray-900 text-[15px]">{username}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{activeProfileMember.role}</p>
                </div>

                <div className="space-y-1.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-left text-[11px] text-gray-500 font-semibold">
                  <div>Email: <span className="text-gray-800 font-bold block truncate">{email}</span></div>
                  <div>Joined on: <span className="text-gray-800 font-bold block">{joinedDate}</span></div>
                </div>

                <Button
                  onClick={() => setActiveProfileMember(null)}
                  className="w-full bg-brand-primary text-white h-10 rounded-2xl text-xs font-bold"
                >
                  Close Profile
                </Button>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>
      {/* Mute Options Overlay Sheet */}
      <AnimatePresence>
        {showMuteOptions && (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] pointer-events-auto p-4 select-none">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl p-5 space-y-3"
            >
              <div className="text-center py-2">
                <p className="font-black text-gray-900 text-sm">Mute notifications for...</p>
              </div>

              <div className="space-y-1">
                {[
                  { key: "8_hours", label: "Mute for 8 Hours" },
                  { key: "1_week", label: "Mute for 1 Week" },
                  { key: "always", label: "Mute Always" }
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => muteMutation.mutate({ muteType: option.key })}
                    disabled={muteMutation.isPending}
                    className="w-full text-left p-3 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                onClick={() => setShowMuteOptions(false)}
                className="w-full justify-center text-xs font-bold text-gray-500 rounded-2xl h-10 border border-gray-100"
              >
                Cancel
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
