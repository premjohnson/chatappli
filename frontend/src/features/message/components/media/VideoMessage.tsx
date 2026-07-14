import { Play, Loader2, Video } from "lucide-react"
import { cn } from "../../../../utils/cn"

interface VideoMessageProps {
  url: string
  fileName: string
  status?: "uploading" | "completed" | "failed"
  progress?: number
  onClick?: () => void
}

export function VideoMessage({ url, fileName, status, progress, onClick }: VideoMessageProps) {
  const isUploading = status === "uploading"
  const isFailed = status === "failed"

  return (
    <div 
      className={cn(
        "relative rounded-xl overflow-hidden bg-black/95 flex items-center justify-center max-w-[280px] sm:max-w-sm cursor-pointer select-none",
        "aspect-video min-h-[140px] max-h-64 border border-black/10 group hover:shadow-lg transition-shadow duration-300"
      )}
      onClick={() => {
        if (!isUploading && !isFailed && onClick) {
          onClick()
        }
      }}
    >
      {/* 1. Main Video element (muted, preloaded metadata for frame preview) */}
      {!isFailed && url && (
        <video
          src={url}
          preload="metadata"
          className="object-cover w-full h-full opacity-65 group-hover:opacity-75 transition-opacity duration-300"
        />
      )}

      {/* 2. Play Icon Overlay */}
      {!isUploading && !isFailed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-3.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 scale-95 group-hover:scale-100 group-hover:bg-white/30 transition-all duration-300 shadow-md">
            <Play className="h-6 w-6 fill-white" />
          </div>
        </div>
      )}

      {/* 3. Uploading Overlay */}
      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] text-white p-2">
          <Loader2 className="h-6 w-6 animate-spin text-orange-400 mb-1" />
          <span className="text-[10px] font-bold">{progress || 0}%</span>
        </div>
      )}

      {/* 4. Error / Failed State */}
      {isFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-500 p-3 text-center">
          <Video className="h-6 w-6 mb-1 text-red-400" />
          <span className="text-xs font-bold truncate w-full px-4">{fileName}</span>
          <span className="text-[9px] font-medium text-red-400">Failed to upload video</span>
        </div>
      )}
    </div>
  )
}
