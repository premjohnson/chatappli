import { io, Socket } from "socket.io-client"
import type { ManagerOptions, SocketOptions } from "socket.io-client"

let socket: Socket | null = null
let isConnecting = false
let operationQueue: Array<() => void> = []

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5013"

const SOCKET_CONFIG: Partial<ManagerOptions & SocketOptions> = {
  withCredentials: true,

  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,

  timeout: 30000,

  transports: ["websocket", "polling"],
  randomizationFactor: 0.5,
}

/* ================= EVENTS ================= */

export const MESSAGE_EVENTS = {
  //no use 
  // SEND: "message:send",
  NEW: "message:new",
  DELIVERED: "message:delivered",
  READ: "message:read",
} as const

/* ================= SOCKET INSTANCE ================= */

export const getSocket = () => socket

export const isSocketConnected = () => socket?.connected ?? false

export const connectSocket = (token: string): Socket | null => {

  if (!token) return null

  if (socket?.connected) return socket

  if (isConnecting) return null

  if (socket && !socket.connected) {
    socket.auth = { token }
    socket.connect()
    return socket
  }

  isConnecting = true

  socket = io(SOCKET_URL, {
    ...SOCKET_CONFIG,
    auth: { token },
  })

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id)
    isConnecting = false
    flushOperationQueue()
  })

  socket.on("disconnect", (reason) => {
    console.warn("[Socket] Disconnected:", reason)
  })

  socket.on("connect_error", async (err) => {
    console.error("[Socket] Error:", err.message)

    // Auto-refresh token if connection fails due to expired or invalid JWT
    if (err.message.includes("expired") || err.message.includes("JWT") || err.message.includes("auth")) {
      console.log("[Socket] Token expired or invalid, attempting automatic refresh...")
      try {
        const axios = (await import("axios")).default
        const apiPrefix = import.meta.env.VITE_API_URL || "http://localhost:5013/api/v1"

        const res = await axios.post(
          `${apiPrefix}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const newToken = res.data.accessToken

        // Update Zustand store
        const { useAuthStore } = await import("../store/auth.store")
        useAuthStore.getState().updateToken(newToken)

        // Reconnect socket with the new token
        updateSocketAuth(newToken)
      } catch (refreshErr) {
        console.error("[Socket] Automatic refresh token failed:", refreshErr)
      }
    }
  })

  return socket
}

/* ================= TOKEN REFRESH ================= */

export const updateSocketAuth = (token: string) => {

  if (!socket) return connectSocket(token)

  socket.auth = { token }

  socket.disconnect()
  socket.connect()

  return socket
}

/* ================= DISCONNECT ================= */

export const disconnectSocket = () => {

  if (!socket) return

  socket.removeAllListeners()
  socket.disconnect()

  socket = null
  isConnecting = false
  operationQueue = []
}

/* ================= OPERATION QUEUE ================= */

const queueOperation = (operation: () => void) => {
  operationQueue.push(operation)
}

const flushOperationQueue = () => {

  if (operationQueue.length === 0) return

  const queue = operationQueue
  operationQueue = []

  queue.forEach((op) => {
    try {
      op()
    } catch (err) {
      console.error("Socket queued operation failed:", err)
    }
  })
}



export const joinConversationRoom = (conversationId: string) => {

  const op = () => socket?.emit("join:room", { conversationId })

  socket?.connected ? op() : queueOperation(op)
}

export const leaveConversationRoom = (conversationId: string) => {

  socket?.emit("leave:room", { conversationId })
}

export const emitTypingStart = (conversationId: string) => {

  const op = () => socket?.emit("typing:start", { conversationId })

  socket?.connected ? op() : queueOperation(op)
}

export const emitTypingStop = (conversationId: string) => {

  if (!socket?.connected) return

  socket.emit("typing:stop", { conversationId })
}

export const emitLiveBlockAction = (payload: {
  blockId: string
  clientVersion: number
  action: {
    type: string
    payload?: any
  }
}) => {
  const op = () => socket?.emit("liveblock:action", payload)
  socket?.connected ? op() : queueOperation(op)
}