import { useState, useEffect, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { CustomVideoPlayer } from "./CustomVideoPlayer"
import { ChevronLeft, ChevronRight, Loader2, Info } from "lucide-react"
import { useMediaViewerStore } from "../../../../store/media.store"
import { MediaToolbar } from "./MediaToolbar"
import { MediaInfoPanel } from "./MediaInfoPanel"
import { cn } from "../../../../utils/cn"

export function MediaViewer() {
  const queryClient = useQueryClient()
  const { isOpen, activeMessageId, conversationId, closeViewer, setActiveMessageId } = useMediaViewerStore()

  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  // Fetch all media messages in the active conversation chronologically
  const mediaMessages = useMemo(() => {
    if (!conversationId) return []
    const cache = queryClient.getQueryData<any>(["messages", conversationId])
    if (!cache?.pages) return []

    const list = cache.pages
      .flatMap((page: any) => page.data)
      .filter((msg: any) => !!msg.fileMeta)

    return [...list].sort(
      (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [conversationId, queryClient, activeMessageId])

  const currentIndex = mediaMessages.findIndex((msg: any) => msg._id === activeMessageId)
  const activeMessage = mediaMessages[currentIndex]

  // Reset zoom and error states when changing active media
  const handleSelectMessage = (msgId: string) => {
    setScale(1)
    setRotation(0)
    setIsLoading(true)
    setHasError(false)
    setActiveMessageId(msgId)
  }

  const handleNext = () => {
    if (currentIndex < mediaMessages.length - 1) {
      handleSelectMessage(mediaMessages[currentIndex + 1]._id)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      handleSelectMessage(mediaMessages[currentIndex - 1]._id)
    }
  }

  // Keyboard navigation & close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeViewer()
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (e.key === "ArrowLeft") {
        handlePrev()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, currentIndex, mediaMessages])

  // Mouse wheel zoom helper
  const handleWheel = (e: React.WheelEvent) => {
    if (activeMessage?.fileMeta?.mimeType?.startsWith("image/")) {
      e.preventDefault()
      if (e.deltaY < 0) {
        setScale((prev) => Math.min(prev + 0.25, 6))
      } else {
        setScale((prev) => Math.max(prev - 0.25, 1))
      }
    }
  }

  const handleDoubleClick = () => {
    if (activeMessage?.fileMeta?.mimeType?.startsWith("image/")) {
      setScale((prev) => (prev > 1 ? 1 : 3))
    }
  }

  const handleDownload = async () => {
    if (!activeMessage?.fileMeta) return
    const { url, fileName } = activeMessage.fileMeta
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = fileName || "download"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, "_blank")
    }
  }

  // Retrieve Sender Name from Conversation Cache
  const senderName = useMemo(() => {
    if (!activeMessage || !conversationId) return "Unknown User"
    const conversations = queryClient.getQueryData<any[]>(["conversations"])
    const currentConvo = conversations?.find((c) => c._id === conversationId)
    if (!currentConvo) return "Unknown User"

    const participant = currentConvo.participants.find(
      (p: any) => {
        const uid = p.user?._id || p.user
        return uid.toString() === activeMessage.sender.toString()
      }
    )
    return participant?.user?.username || "Unknown User"
  }, [activeMessage, conversationId, queryClient])

  if (!isOpen || !activeMessage) return null

  const fileMeta = activeMessage.fileMeta
  const isImage = fileMeta?.mimeType?.startsWith("image/") || false
  const isVideo = fileMeta?.mimeType?.startsWith("video/") || false

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] bg-black/95 flex flex-col md:flex-row overflow-hidden"
        onWheel={handleWheel}
      >
        {/* Main Content Area */}
        <div className="flex-1 relative flex items-center justify-center p-4 min-h-0 min-w-0">
          
          {/* Top Toolbar */}
          <MediaToolbar
            onZoomIn={() => setScale((prev) => Math.min(prev + 0.5, 6))}
            onZoomOut={() => setScale((prev) => Math.max(prev - 0.5, 1))}
            onResetZoom={() => {
              setScale(1)
              setRotation(0)
            }}
            onRotate={() => setRotation((prev) => (prev + 90) % 360)}
            onDownload={handleDownload}
            onNewTab={() => window.open(fileMeta?.url, "_blank")}
            onClose={closeViewer}
            zoomLevel={scale}
            isImage={isImage}
            isDownloadable={!!fileMeta?.url}
          />

          {/* Left Arrow Button */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-6 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 text-white z-50 transition-all cursor-pointer hidden md:block"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Center media element (Image or Video) */}
          <div 
            className="w-full h-full flex items-center justify-center relative overflow-hidden"
            onDoubleClick={handleDoubleClick}
            onClick={(e) => {
              // Click outside media closes viewer
              if (e.target === e.currentTarget) {
                closeViewer()
              }
            }}
          >
            {isLoading && !hasError && (
              <div className="absolute flex items-center justify-center z-40">
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
              </div>
            )}

            {hasError && (
              <div className="text-red-500 font-bold flex flex-col items-center gap-2">
                <span>Failed to load media file</span>
              </div>
            )}

            {isImage && !hasError && (
              <motion.div
                drag={scale > 1}
                dragConstraints={{ left: -300 * scale, right: 300 * scale, top: -200 * scale, bottom: 200 * scale }}
                dragElastic={0.15}
                style={{ x: 0, y: 0 }}
                animate={{ scale, rotate: rotation }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="max-h-[85vh] max-w-[90vw]"
              >
                <img
                  src={fileMeta?.url}
                  alt={fileMeta?.fileName}
                  className="max-h-[80vh] max-w-[85vw] object-contain select-none rounded-lg pointer-events-none shadow-2xl"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false)
                    setHasError(true)
                  }}
                />
              </motion.div>
            )}

            {isVideo && !hasError && (
              <div className="max-w-[80vw] max-h-[75vh] w-full flex items-center justify-center rounded-lg overflow-hidden shadow-2xl z-20">
                <CustomVideoPlayer
                  url={fileMeta?.url || ""}
                  autoPlay
                />
              </div>
            )}
          </div>

          {/* Right Arrow Button */}
          {currentIndex < mediaMessages.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-6 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 text-white z-50 transition-all cursor-pointer hidden md:block"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Info Panel toggle button */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={cn(
              "absolute bottom-6 right-6 p-3 rounded-full z-50 transition-all cursor-pointer border",
              showInfo 
                ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20" 
                : "bg-white/5 border-white/10 text-white hover:bg-white/10"
            )}
            title="Toggle File Info"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Metadata Info Panel */}
        {showInfo && fileMeta && (
          <MediaInfoPanel
            fileName={fileMeta.fileName || fileMeta.name || "Unnamed File"}
            fileSize={fileMeta.size || 0}
            mimeType={fileMeta.mimeType || "application/octet-stream"}
            uploadDate={activeMessage.createdAt}
            senderName={senderName}
            caption={activeMessage.text} // Use decrypted message text if any as caption
          />
        )}
      </div>
    </AnimatePresence>
  )
}
