import { useState } from "react"
import ConversationList from "../../conversation/components/ConversationList"
import NewChatButton from "./NewChatButton"
import NewConversationModal from "./NewConversationModal"

export default function ChatSidebar() {

  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <aside
      className="w-[320px] bg-[#eef2f6] rounded-2xl h-full flex flex-col flex-shrink-0"
      style={{
        boxShadow: "8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.9)"
      }}
    >

      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 shrink-0">
        <h1 className="font-semibold text-lg">
          Messages
        </h1>
        <NewChatButton onClick={handleOpenModal} />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2">
        <ConversationList />
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal isOpen={isModalOpen} onClose={handleCloseModal} />

    </aside>
  )
}