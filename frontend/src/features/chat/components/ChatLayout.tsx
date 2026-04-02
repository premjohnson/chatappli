import { useEffect } from "react"
import ChatSidebar from "./ChatSidebar"
import ChatWindow from "./ChatWindow"
import { connectSocket, disconnectSocket } from "../../../lib/socket"
import { useAuthStore } from "../../../store/auth.store"

export default function ChatLayout() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    // ✅ Only connect socket if user is authenticated
    if (user) {
      connectSocket()

      return () => {
        disconnectSocket()
      }
    }
  }, [user])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#e8edf2] p-4 sm:p-8 gap-6 text-[#1f2937]">

      {/* Sidebar */}
      <ChatSidebar />

      {/* Chat Window */}
      <ChatWindow />

    </div>
  )
}