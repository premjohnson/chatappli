export interface FileMeta {
  publicId?: string
  url?: string
  mimeType?: string
  size?: number
  name?: string
}

export interface MessageEditHistory {
  previousContent: string
  editedAt: string
}

export interface Message {
  _id: string
  conversation: string
  sender: string
  senderPublicKey?: string
  encryptedContent: string | null
  nonce: string | null
  type: "text" | "image" | "file" | "system"
  status: "sent" | "delivered" | "read"
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
  deliveredAt?: string
  readAt?: string
}