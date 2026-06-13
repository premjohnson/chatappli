import { useEffect } from "react"
import { ChatSidebar } from "./ChatSidebar"
import { ChatWindow } from "./ChatWindow"
import { connectSocket, disconnectSocket } from "../../../lib/socket"
import { registerSocketListeners } from "../../../lib/socket.listeners"
import { useAuthStore } from "../../../store/auth.store"
import { useChatStore } from "../../../store/chat.store"
import { cn } from "../../../utils/cn"
import { motion } from "framer-motion"

export function ChatLayout() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeConversationId = useChatStore((s) => s.activeConversationId)

  useEffect(() => {
    if (user && accessToken) {
      connectSocket(accessToken)
      registerSocketListeners()
      return () => {
        disconnectSocket()
      }
    }
  }, [user, accessToken])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-warm-gradient p-4 md:p-6 gap-4 md:gap-6 relative">
      {/* Background Ambient Blobs */}
      <motion.div
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-brand-primary/5 rounded-full blur-[80px] pointer-events-none"
      />

      {/* Secondary Ambient Blob */}
      <motion.div
        animate={{
          x: [0, -40, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[10%] right-[15%] w-[35%] h-[35%] bg-brand-accent/5 rounded-full blur-[100px] pointer-events-none"
      />

      {/* Sidebar - responsive toggle */}
      <div className={cn("w-full md:max-w-[320px] shrink-0 h-full flex flex-col", activeConversationId ? "hidden md:flex" : "flex")}>
        <ChatSidebar />
      </div>

      {/* Main Chat Area - responsive toggle */}
      <motion.main 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn("flex-1 min-w-0 h-full flex flex-col", activeConversationId ? "flex" : "hidden md:flex")}
      >
        <ChatWindow />
      </motion.main>
    </div>
  )
}
