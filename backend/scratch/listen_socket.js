import { io } from "socket.io-client";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const SOCKET_URL = "http://localhost:5013";
// Replace with a valid conversation ID from your db
const CONVERSATION_ID = "6a4f9b5ec34fd5f6b7c82bd2"; 

async function run() {
  console.log("Connecting to socket server at:", SOCKET_URL);

  const socket = io(SOCKET_URL, {
    transports: ["websocket"],
    withCredentials: true
  });

  socket.on("connect", () => {
    console.log("Socket connected, ID:", socket.id);

    // Join room
    socket.emit("join:room", { conversationId: CONVERSATION_ID });
    console.log(`Emitted join:room for conversation: ${CONVERSATION_ID}`);
  });

  socket.on("message:read", (payload) => {
    console.log("Received message:read event!");
    console.log("Payload:", JSON.stringify(payload, null, 2));
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });

  // Keep alive for 30s
  setTimeout(() => {
    socket.disconnect();
    console.log("Socket disconnected");
    process.exit(0);
  }, 30000);
}

run();
