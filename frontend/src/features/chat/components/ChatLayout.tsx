import { useEffect } from "react"
import { ChatSidebar } from "./ChatSidebar"
import { ChatWindow } from "./ChatWindow"
import { connectSocket, disconnectSocket } from "../../../lib/socket"
import { useAuthStore } from "../../../store/auth.store"
import { motion } from "framer-motion"

export function ChatLayout() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (user) {
      connectSocket()
      return () => {
        disconnectSocket()
      }
    }
  }, [user])

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

      {/* Sidebar */}
      <ChatSidebar />

      {/* Main Chat Area */}
      <motion.main 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 min-w-0"
      >
        <ChatWindow />
      </motion.main>
    </div>
  )
}
