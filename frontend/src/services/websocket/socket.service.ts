import { getSocket } from "../lib/socket"

const MESSAGE_EVENTS = {
  SEND: "message:send",
  NEW: "message:new",
  DELIVERED: "message:delivered",
  READ: "message:read"
}

export const emitSendMessage = (payload: {
  conversationId: string
  encryptedContent: string
  nonce: string
  clientMessageId: string
  type?: string
}) => {

  const socket = getSocket()

  if (!socket || !socket.connected) return

  socket.emit(MESSAGE_EVENTS.SEND, payload)
}

export const joinConversationRoom = (conversationId: string) => {

  const socket = getSocket()
  if (!socket) return

  socket.emit("join:room", { conversationId })

}

export const leaveConversationRoom = (conversationId: string) => {

  const socket = getSocket()
  if (!socket) return

  socket.emit("leave:room", { conversationId })

}

export const emitTypingStart = (conversationId: string) => {

  const socket = getSocket()
  if (!socket) return

  socket.emit("typing:start", { conversationId })

}

export const emitTypingStop = (conversationId: string) => {

  const socket = getSocket()
  if (!socket) return

  socket.emit("typing:stop", { conversationId })

}