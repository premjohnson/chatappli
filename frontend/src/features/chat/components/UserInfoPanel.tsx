import { useMemo } from "react"
import type { ConversationParticipant } from "../../conversation/types/conversation.types"
import { motion } from "framer-motion"
import { X, Mail, Shield, Image, Ban, User } from "lucide-react"
import { Button } from "../../../components/ui/Button"
import { GlassPanel } from "../../../components/ui/GlassPanel"

interface UserInfoPanelProps {
  participant: ConversationParticipant
  isOnline: boolean
  onClose: () => void
}

export default function UserInfoPanel({
  participant,
  isOnline,
  onClose
}: UserInfoPanelProps) {
  const user: any = participant;
  const sharedMedia = useMemo(() => [], [])

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
        className="absolute right-0 top-0 h-full w-full max-w-[360px] glass-panel border-l border-white/20 shadow-premium pointer-events-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="font-bold text-gray-900 tracking-tight text-xl">Information</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Hero Section */}
          <div className="p-8 text-center">
            <div className="relative inline-block mb-6">
              <div className="w-28 h-28 rounded-[2.5rem] bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-4xl shadow-inner border border-brand-primary/20 overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  user?.username?.charAt(0).toUpperCase() || "?"
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white shadow-sm ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
              {user?.username || "Unknown User"}
            </h3>
            <p className={`mt-1 text-sm font-bold uppercase tracking-widest ${isOnline ? "text-emerald-500" : "text-gray-400"}`}>
              {isOnline ? "Online Now" : "Currently Offline"}
            </p>
          </div>

          {/* Details Section */}
          <div className="px-6 space-y-8 mb-8">
            {user?.email && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <Mail className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Email Address</span>
                </div>
                <a href={`mailto:${user.email}`} className="text-[15px] font-semibold text-brand-primary hover:underline block truncate">
                  {user.email}
                </a>
              </div>
            )}

            {participant.role && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <Shield className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Conversation Role</span>
                </div>
                <p className="text-[15px] font-semibold text-gray-800 capitalize">
                  {participant.role}
                </p>
              </div>
            )}

            {/* Media Section */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Image className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Shared Media</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">0 items</span>
              </div>
              <div className="bg-brand-primary/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center border border-brand-primary/5">
                <p className="text-sm font-medium text-gray-400">No media shared in this conversation yet.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white/40 backdrop-blur-md border-t border-white/10 space-y-3">
          <Button className="w-full justify-start gap-3 h-12 rounded-2xl">
            <User className="h-4 w-4" />
            View Full Profile
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-12 rounded-2xl border-red-500/20 text-red-500 hover:bg-red-500/5 hover:border-red-500/30">
            <Ban className="h-4 w-4" />
            Block {user?.username}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
