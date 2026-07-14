import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"
import { motion, AnimatePresence } from "framer-motion"
import { X, Mail, Shield, Image, Ban, User, VolumeX, Volume2 } from "lucide-react"
import { Button } from "../../../components/ui/Button"
import { useState, useMemo } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { muteConversationApi } from "../../conversation/api/muteConversation.api"

interface UserInfoPanelProps {
  participant: ConversationParticipant
  isOnline: boolean
  onClose: () => void
  conversationId?: string
}

export default function UserInfoPanel({
  participant,
  isOnline,
  onClose,
  conversationId
}: UserInfoPanelProps) {
  const queryClient = useQueryClient()
  const user = participant.user as any
  const username = user?.username || participant.username || "Unknown User"
  const email = user?.email || participant.email || ""
  const avatar = user?.avatar || participant.avatar || ""

  const initial = username.charAt(0).toUpperCase()

  const [showMuteOptions, setShowMuteOptions] = useState(false)

  const isMuted = useMemo(() => {
    if (!participant?.muteUntil) return false
    return new Date(participant.muteUntil) > new Date()
  }, [participant?.muteUntil])

  const muteMutation = useMutation({
    mutationFn: (payload: { muteType: any; durationSeconds?: number }) => {
      if (!conversationId) throw new Error("Conversation ID missing")
      return muteConversationApi(conversationId, payload)
    },
    onSuccess: (updatedConvo: Conversation) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return []
        return old.map((c) => (c._id === conversationId ? { ...c, ...updatedConvo } : c))
      })
      setShowMuteOptions(false)
    }
  })

  return (
    <div className="absolute inset-0 z-50 overflow-hidden pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/5 backdrop-blur-[2px] pointer-events-auto"
      />
      
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute right-0 top-0 h-full w-full max-w-[340px] bg-white/70 border-l border-white/20 shadow-premium pointer-events-auto flex flex-col backdrop-blur-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 select-none">
          <h2 className="font-bold text-gray-900 tracking-tight text-lg">Information</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 text-gray-400 hover:text-gray-900">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Hero Section */}
          <div className="p-8 text-center select-none">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-[2rem] bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-3xl shadow-inner border border-brand-primary/20 overflow-hidden">
                {avatar ? (
                  <img src={avatar} alt={username} className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-4 border-white shadow-sm ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
            </div>

            <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
              {username}
            </h3>
            <p className={`mt-1 text-[10px] font-black uppercase tracking-wider ${isOnline ? "text-emerald-500" : "text-gray-400"}`}>
              {isOnline ? "Online Now" : "Offline"}
            </p>
          </div>

          {/* Details Section */}
          <div className="px-6 space-y-6 mb-8 select-none">
            {email && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <Mail className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Email Address</span>
                </div>
                <a href={`mailto:${email}`} className="text-[14px] font-semibold text-brand-primary hover:underline block truncate">
                  {email}
                </a>
              </div>
            )}

            {participant.role && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <Shield className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Conversation Role</span>
                </div>
                <p className="text-[14px] font-semibold text-gray-800 capitalize">
                  {participant.role}
                </p>
              </div>
            )}

            {/* Media Section */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Image className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Shared Media</span>
                </div>
                <span className="text-[9px] font-black text-gray-400 bg-gray-900/5 px-2 py-0.5 rounded-full">0 items</span>
              </div>
              <div className="bg-brand-primary/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-brand-primary/5">
                <p className="text-xs font-semibold text-gray-400 leading-normal">No media shared in this conversation yet.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mute Notifications Toggle */}
        <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between select-none shrink-0">
          <span className="text-xs font-bold text-gray-700">Mute Notifications</span>
          {isMuted ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => muteMutation.mutate({ muteType: "unmute" })}
              disabled={muteMutation.isPending || !conversationId}
              className="h-7 px-2.5 gap-1.5 text-xs text-red-500 hover:bg-red-50"
            >
              <VolumeX className="h-4 w-4" />
              Muted
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowMuteOptions(true)}
              disabled={muteMutation.isPending || !conversationId}
              className="h-7 px-2.5 gap-1.5 text-xs text-gray-500 hover:bg-gray-50"
            >
              <Volume2 className="h-4 w-4" />
              Mute
            </Button>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white/40 border-t border-white/10 space-y-3 shrink-0">
          <Button className="w-full justify-start gap-3 h-11 rounded-xl text-xs font-bold uppercase tracking-wider">
            <User className="h-4 w-4" />
            View Full Profile
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-11 rounded-xl text-xs font-bold uppercase tracking-wider border-red-500/20 text-red-500 hover:bg-red-500/5 hover:border-red-500/30">
            <Ban className="h-4 w-4" />
            Block {username}
          </Button>
        </div>
      </motion.div>

      {/* Mute Options Overlay Sheet */}
      <AnimatePresence>
        {showMuteOptions && (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] pointer-events-auto p-4 select-none">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl p-5 space-y-3"
            >
              <div className="text-center py-2">
                <p className="font-black text-gray-900 text-sm">Mute notifications for...</p>
              </div>

              <div className="space-y-1">
                {[
                  { key: "8_hours", label: "Mute for 8 Hours" },
                  { key: "1_day", label: "Mute for 1 Day" },
                  { key: "1_week", label: "Mute for 1 Week" },
                  { key: "always", label: "Mute Always" }
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => muteMutation.mutate({ muteType: option.key })}
                    disabled={muteMutation.isPending}
                    className="w-full text-left p-3 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                onClick={() => setShowMuteOptions(false)}
                className="w-full justify-center text-xs font-bold text-gray-500 rounded-2xl h-10 border border-gray-100"
              >
                Cancel
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
