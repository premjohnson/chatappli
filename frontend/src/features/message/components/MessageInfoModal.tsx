import { useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { X, Check, CheckCheck, Shield, Clock } from "lucide-react"
import type { Message } from "../types/message.types"

interface MessageInfoModalProps {
  isOpen: boolean
  onClose: () => void
  message: Message | null
  conversationId: string
}

export function MessageInfoModal({ isOpen, onClose, message, conversationId }: MessageInfoModalProps) {
  const queryClient = useQueryClient()

  if (!isOpen || !message) return null

  // Fetch conversations to find participant details
  const conversations = queryClient.getQueryData<any[]>(["conversations"])
  const currentConvo = conversations?.find((c) => c._id === conversationId)

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return ""
    return new Date(isoString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  // Resolve receipts per participant
  const receiptsList = (() => {
    if (!currentConvo) return []

    return currentConvo.participants.map((participant: any) => {
      const userId = (participant.user?._id || participant.user).toString()
      const username = participant.user?.username || "Unknown Participant"
      
      const receipt = message.deliveryReceipts?.find(
        (r: any) => r.user.toString() === userId
      )

      return {
        userId,
        username,
        avatar: participant.user?.avatar,
        deliveredAt: receipt?.deliveredAt,
        readAt: receipt?.readAt
      }
    })
  })()

  // Split into status lists
  const readBy = receiptsList.filter((r: any) => r.readAt)
  const deliveredTo = receiptsList.filter((r: any) => r.deliveredAt && !r.readAt)
  const pending = receiptsList.filter((r: any) => !r.deliveredAt && !r.readAt)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm select-none p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] text-gray-800"
        >
          {/* Header */}
          <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
            <h3 className="font-black text-sm uppercase tracking-wider text-gray-900">Message Info</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {/* Sent time */}
            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <Clock className="h-5 w-5 text-orange-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Sent Time</p>
                <p className="text-xs font-bold text-gray-800">{formatTime(message.createdAt)}</p>
              </div>
            </div>

            {/* Recipients Receipts (Delivery/Read status) */}
            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-150 pb-1.5">Receipts</h4>
              
              {/* 1. Read By List */}
              {readBy.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                    <CheckCheck className="h-4 w-4 text-emerald-500" /> Read By ({readBy.length})
                  </span>
                  <div className="flex flex-col gap-2 pl-2">
                    {readBy.map((r: any) => (
                      <div key={r.userId} className="flex justify-between items-center text-xs font-bold text-gray-700">
                        <span>{r.username}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{formatTime(r.readAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Delivered To List */}
              {deliveredTo.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                    <CheckCheck className="h-4 w-4 text-gray-400" /> Delivered To ({deliveredTo.length})
                  </span>
                  <div className="flex flex-col gap-2 pl-2">
                    {deliveredTo.map((r: any) => (
                      <div key={r.userId} className="flex justify-between items-center text-xs font-bold text-gray-700">
                        <span>{r.username}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{formatTime(r.deliveredAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Sent List */}
              {pending.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Check className="h-4 w-4 text-gray-400" /> Sent (Not yet delivered) ({pending.length})
                  </span>
                  <div className="flex flex-col gap-2 pl-2">
                    {pending.map((r: any) => (
                      <div key={r.userId} className="flex justify-between items-center text-xs font-bold text-gray-500">
                        <span>{r.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Encryption & Devices */}
            <div className="flex flex-col gap-3 border-t border-gray-100 pt-5">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-orange-500" /> End-to-End Encryption Keys
              </span>
              <p className="text-[10px] leading-relaxed text-gray-400 font-medium">
                This message was encrypted separately for each active device key using double-ratchet keys.
              </p>
              {message.encryptedPayloads && message.encryptedPayloads.length > 0 && (
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-2xl border border-gray-105">
                  {message.encryptedPayloads.map((payload, idx) => (
                    <div key={idx} className="flex justify-between text-[9px] font-mono text-gray-500">
                      <span className="truncate max-w-[180px]">Device: {payload.recipientDeviceId}</span>
                      <span className="text-gray-400 truncate max-w-[150px]">Recipient: {payload.recipientUser}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
