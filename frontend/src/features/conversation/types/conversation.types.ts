export interface ConversationParticipant {
  _id: string
  username?: string
  email?: string
  avatar?: string
  publicKey?: string
  role?: "member" | "admin" | "owner"
  unreadCount?: number
  lastReadAt?: string
  user?: Record<string, unknown>
  muteUntil?: string | null
  joinedAt?: string
}

export interface InviteLinkOptions {
  maxUses?: number
  expiresIn?: number
}

export interface ConversationEncryptionMeta {
  algorithm: "nacl-box"
  sharedKeyId: string | null
}

export interface ConversationGroupSettings {
  onlyAdminsCanSend?: boolean
  onlyAdminsCanAddMembers?: boolean
  onlyAdminsCanEditInfo?: boolean
}

export interface Conversation {
  _id: string
  type: "private" | "group"
  groupName?: string
  groupAbout?: string
  groupAvatar?: {
    publicId: string
    url: string
  }
  groupSettings?: ConversationGroupSettings
  participants: ConversationParticipant[]
  createdBy?: string
  encryptionMeta?: ConversationEncryptionMeta
  lastMessage?: {
    _id: string
    [key: string]: unknown
  } | unknown
  lastMessageAt?: string
  createdAt: string
  updatedAt: string
  inviteLinks?: any[]
  joinRequests?: any[]
}

export interface CreatePrivateConversationPayload {
  targetUserId: string
}

export interface CreateGroupConversationPayload {
  name: string
  participants: string[]
  avatar?: File
}

export function getParticipantUserId(p: ConversationParticipant | undefined | null): string {
  if (!p) return "";
  const userObj = p.user as { _id?: string; id?: string } | undefined;
  return userObj?._id || userObj?.id || p._id || "";
}

export function isParticipantCurrentUser(p: ConversationParticipant | undefined | null, currentUserId?: string): boolean {
  if (!currentUserId || !p) return false;
  return getParticipantUserId(p) === currentUserId;
}