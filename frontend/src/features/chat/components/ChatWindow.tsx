import { useChatStore } from "../../../store/chat.store"
import { useAuthStore } from "../../../store/auth.store"
import { ChatHeader } from "./ChatHeader"
import MessageList from "../../message/components/MessageList"
import { MessageInput } from "../../message/components/MessageInput"
import UserInfoPanel from "./UserInfoPanel"
import GroupInfoPanel from "./GroupInfoPanel"
import { useMyConversations } from "../../conversation/hooks/useMyConversations"
import { markAsReadApi } from "../../message/api/markAsRead.api"
import { joinConversationRoom, leaveConversationRoom } from "../../../lib/socket"
import { useEffect, useRef, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Lock, Key, Search } from "lucide-react"
import { Input } from "../../../components/ui/Input"
import { Button } from "../../../components/ui/Button"
import type { Conversation, ConversationParticipant } from "../../conversation/types/conversation.types"
import { getParticipantUserId, isParticipantCurrentUser } from "../../conversation/types/conversation.types"
import { useMessages } from "../../message/hooks/useMessages"
import { queryClient } from "../../../lib/queryClient"

export function ChatWindow() {
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const presenceMap = useChatStore((s) => s.presenceMap)
  const currentUser = useAuthStore((s) => s.user)
  const { data: conversations } = useMyConversations()
  const [showUserInfo, setShowUserInfo] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState("")
  const [isSearchActive, setIsSearchActive] = useState(false)
  const isMarkingRead = useRef(false)
  const { data: messageData } = useMessages(activeConversationId ?? "");

  const currentConvo = conversations?.find((c: Conversation) => c._id === activeConversationId)
  const receiver = currentConvo?.participants.find((p: ConversationParticipant) => !isParticipantCurrentUser(p, currentUser?.id))
  const receiverId = getParticipantUserId(receiver)
  const isOnline = presenceMap[receiverId] || false

      const messages = useMemo(() => {

        if (!messageData?.pages) {
          return [];
        }

        return [...messageData.pages]
          .reverse()
          .flatMap((page) => page.data);

      }, [messageData]);

      const hasUnreadIncoming = useMemo(() => {
        return messages.some((message) => {
          // Ignore my own messages
          if (message.sender === currentUser?.id) {
            return false;
          }

          const myReceipt = message.deliveryReceipts.find(
            (receipt) => String(receipt.user) === currentUser?.id
          );

          return !myReceipt?.readAt;
        });
      }, [messages, currentUser?.id]);



        useEffect(() => {
            if (activeConversationId) {
                joinConversationRoom(activeConversationId)

                return () => {
                    leaveConversationRoom(activeConversationId)
                }
            }
        }, [activeConversationId])
    //ref changed to true here at effect to prevent multiple calls to markAsReadApi when the component re-renders
    useEffect(() => {
        if (!activeConversationId) return;

        const markAsRead = () => {
            if (!hasUnreadIncoming) return;
            if (isMarkingRead.current) return;

            // Only mark as read if the document is visible
            if (document.visibilityState !== "visible") {
                return;
            }

            // Optimistically set unreadCount to 0 for this conversation in the cache
            queryClient.setQueryData(["conversations"], (old: any) => {
                if (!Array.isArray(old)) return old;
                const currentUserId = useAuthStore.getState().user?.id;
                return old.map((c: any) => {
                    if (c._id === activeConversationId) {
                        return {
                            ...c,
                            participants: c.participants.map((p: any) =>
                                isParticipantCurrentUser(p, currentUserId)
                                    ? { ...p, unreadCount: 0 }
                                    : p
                            )
                        };
                    }
                    return c;
                });
            });

            isMarkingRead.current = true;

            markAsReadApi(activeConversationId)
                .catch(console.error)
                .finally(() => {
                    isMarkingRead.current = false;
                });
        };

        // Try marking as read immediately
        markAsRead();

        // Listen for activity to mark as read when user focuses or returns to the window
        const handleActivity = () => {
            markAsRead();
        };

        window.addEventListener("focus", handleActivity);
        document.addEventListener("visibilitychange", handleActivity);

        return () => {
            window.removeEventListener("focus", handleActivity);
            document.removeEventListener("visibilitychange", handleActivity);
        };

    }, [activeConversationId, hasUnreadIncoming]);
    //this for helping to debug the issue of multiple calls to markAsReadApi when the component re-renders
    useEffect(() => {
    console.log({
        hasUnreadIncoming,
        activeConversationId,
        messages: messages.length
    });
}, [hasUnreadIncoming, activeConversationId, messages.length]);

  return (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-2xl rounded-[2.5rem] relative overflow-hidden border border-white/40 shadow-premium">
      {activeConversationId ? (
        <>
          <ChatHeader
            conversationId={activeConversationId}
            onOpenUserInfo={() => setShowUserInfo(true)}
            onToggleSearch={() => setIsSearchActive(!isSearchActive)}
          />

          {isSearchActive && (
            <div className="px-6 py-2.5 bg-gray-50 border-b border-white/10 flex items-center gap-3 select-none">
              <Input
                placeholder="Search messages in this chat..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                className="bg-white text-xs h-9 py-1 flex-1"
                icon={<Search className="h-4 w-4" />}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsSearchActive(false)
                  setChatSearchQuery("")
                }}
                className="h-8 text-xs font-bold"
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <MessageList conversationId={activeConversationId} searchQuery={chatSearchQuery} />
          </div>

          <MessageInput conversationId={activeConversationId} />

          <AnimatePresence>
            {showUserInfo && currentConvo && (
              currentConvo.type === "group" ? (
                <GroupInfoPanel
                  conversation={currentConvo}
                  onClose={() => setShowUserInfo(false)}
                />
              ) : receiver ? (
                <UserInfoPanel
                  participant={receiver}
                  isOnline={isOnline}
                  conversationId={activeConversationId ?? undefined}
                  onClose={() => setShowUserInfo(false)}
                />
              ) : null
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="w-24 h-24 rounded-[2.5rem] bg-brand-primary/10 flex items-center justify-center mb-8 border border-brand-primary/20 relative"
          >
            <Shield className="w-10 h-10 text-brand-primary" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
              className="absolute -inset-2 rounded-[3rem] border border-dashed border-brand-primary/30 pointer-events-none"
            />
          </motion.div>

          <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-3">
            Secure Communication Workspace
          </h3>
          <p className="text-gray-500 max-w-[320px] leading-relaxed text-sm font-medium mb-8">
            Select a conversation from the sidebar to establish a secure, end-to-end encrypted chat session.
          </p>

          {/* Core Security Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full text-left">
            <div className="p-4 rounded-2xl bg-white/30 border border-white/40 flex flex-col gap-2">
              <Lock className="w-5 h-5 text-brand-primary" />
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">E2E Encryption</p>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Messages are encrypted on your device and can only be read by the recipient.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/30 border border-white/40 flex flex-col gap-2">
              <Key className="w-5 h-5 text-brand-primary" />
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">P2P Verification</p>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Verify session keys out-of-band to ensure zero middleman interception.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/30 border border-white/40 flex flex-col gap-2">
              <Shield className="w-5 h-5 text-brand-primary" />
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Device Lock</p>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Each cryptographic identity is linked directly to your physical browser storage.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
