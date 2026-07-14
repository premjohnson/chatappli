export interface FileMeta {
  publicId?: string
  url?: string
  mimeType?: string
  size?: number
  name?: string
  fileName?: string
  progress?: number
  status?: 'uploading' | 'completed' | 'failed'
}

export interface MessageEditHistory {
  previousContent: string
  editedAt: string
}
export interface EncryptedPayload {
  recipientUser: string
  recipientDeviceId: string
  encryptedContent: string
  nonce: string
}

export interface DeliveryReceipt {
  user: string
  deliveredAt?: string | null
  readAt?: string | null
}

export interface Message {
  _id: string
  conversation: string
  sender: string
  senderPublicKey?: string

  // Legacy (temporary during migration)
  encryptedContent?: string | null
  nonce?: string | null
  // New multi-device payloads
  encryptedPayloads?: EncryptedPayload[]

  type: "text" | "image" | "file" | "system"
  deliveryReceipts: DeliveryReceipt[]

  fileMeta?: FileMeta

  createdAt: string
  updatedAt: string

  editedAt?: string
  editHistory?: MessageEditHistory[]

  isDeletedForEveryone?: boolean
  deleteForEveryoneAt?: string
  deletedFor?: string[]

  replyTo?: string
  forwardedFrom?: string

  signature?: string
  senderDeviceId?: string
  clientMessageId?: string
  isPinned?: boolean
  starredBy?: string[]
  reactions?: { user: string; emoji: string }[]
  isEdited?: boolean
}
