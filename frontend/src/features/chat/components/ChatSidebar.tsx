import { useState } from "react"
import ConversationList from "../../conversation/components/ConversationList"
import NewChatButton from "./NewChatButton"
import NewConversationModal from "./NewConversationModal"
import { motion } from "framer-motion"
import { Search } from "lucide-react"
import { Input } from "../../../components/ui/Input"

export function ChatSidebar() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleOpenModal = () => setIsModalOpen(true)
  const handleCloseModal = () => setIsModalOpen(false)

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-[320px] glass-panel rounded-3xl h-full flex flex-col flex-shrink-0 relative overflow-hidden"
    >
      {/* Sidebar Header */}
      <div className="h-20 flex items-center justify-between px-6 shrink-0 border-b border-white/10">
        <h1 className="font-bold text-2xl text-gray-900 tracking-tight">
          Messages
        </h1>
        <NewChatButton onClick={handleOpenModal} />
      </div>

      {/* Inline Search Bar */}
      <div className="px-4 pt-3 shrink-0">
        <Input
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="h-4 w-4 text-gray-400" />}
          className="text-xs h-9 px-3.5 py-1.5 rounded-xl bg-white/10 border-none placeholder:text-gray-400"
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <ConversationList searchQuery={searchQuery} />
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </motion.aside>
  )
}
