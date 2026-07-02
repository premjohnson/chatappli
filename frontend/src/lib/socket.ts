import { io, Socket } from "socket.io-client";
import type { ManagerOptions, SocketOptions } from "socket.io-client";

let socket: Socket | null = null;
let isConnecting = false;
let operationQueue: Array<() => void> = [];

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5013";

const SOCKET_CONFIG = Object.freeze({
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 30000,
    transports: ["websocket", "polling"],
    randomizationFactor: 0.5,
} satisfies Partial<ManagerOptions & SocketOptions>);

/* ================= EVENTS ================= */

export const MESSAGE_EVENTS = {
  NEW: "message:new",
  DELIVERED: "message:delivered",
  READ: "message:read",
} as const;

/* ================= SOCKET INSTANCE ================= */

export const getSocket = () => socket;

export const isSocketConnected = () => socket?.connected ?? false;

export const connectSocket = (token: string): Socket | null => {
    if (!token) return null;

    if (socket) {
        const currentToken =
          typeof socket.auth === "object"
              ? socket.auth.token
              : undefined;

        if (currentToken !== token) {
            socket.auth = { token };

            if (socket.connected) {
                socket.disconnect().connect();
            } else {
                socket.connect();
            }
        }

        return socket;
    }

    if (isConnecting) return null;

    isConnecting = true;

    socket = io(SOCKET_URL, {
        ...SOCKET_CONFIG,
        auth: { token },
    });

    socket.on("connect", () => {
        console.log("[Socket] Connected:", socket?.id);

        isConnecting = false;
        flushOperationQueue();
    });

    socket.on("disconnect", (reason) => {
        if (reason !== "io client disconnect") {
            console.warn("[Socket] Disconnected:", reason);
        }

        isConnecting = false;
    });

    socket.on("connect_error", (err) => {
        console.error("[Socket] Connection error:", err.message);

        isConnecting = false;
    });

    return socket;
};

/* ================= TOKEN UPDATE ================= */

export const updateSocketAuth = (token: string) => {
  if (!socket) {
    return connectSocket(token);
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
    return socket;
  }

  socket.disconnect().connect();

  return socket;
};

/* ================= DISCONNECT ================= */

export const disconnectSocket = () => {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();

  socket = null;
  isConnecting = false;
  operationQueue = [];
};

/* ================= OPERATION QUEUE ================= */

const queueOperation = (operation: () => void) => {
  operationQueue.push(operation);
};

const flushOperationQueue = () => {
  if (operationQueue.length === 0) return;

  const queue = operationQueue;
  operationQueue = [];

  queue.forEach((op) => {
    try {
      op();
    } catch (err) {
      console.error("[Socket] Queued operation failed:", err);
    }
  });
};

/* ================= ROOMS ================= */

export const joinConversationRoom = (conversationId: string) => {
  const op = () => socket?.emit("join:room", { conversationId });

  socket?.connected ? op() : queueOperation(op);
};

export const leaveConversationRoom = (conversationId: string) => {
  socket?.emit("leave:room", { conversationId });
};

/* ================= TYPING ================= */

export const emitTypingStart = (conversationId: string) => {
  const op = () => socket?.emit("typing:start", { conversationId });

  socket?.connected ? op() : queueOperation(op);
};

export const emitTypingStop = (conversationId: string) => {
  if (!socket?.connected) return;

  socket.emit("typing:stop", { conversationId });
};

/* ================= LIVEBLOCK ================= */

export const emitLiveBlockAction = (payload: {
  blockId: string;
  clientVersion: number;
  action: {
    type: string;
    payload?: any;
  };
}) => {
  const op = () => socket?.emit("liveblock:action", payload);

  socket?.connected ? op() : queueOperation(op);
};