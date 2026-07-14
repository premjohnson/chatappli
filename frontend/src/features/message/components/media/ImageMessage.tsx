import { useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "../../../../utils/cn"

interface ImageMessageProps {
  url: string
  fileName: string
  status?: "uploading" | "completed" | "failed"
  progress?: number
  onClick?: () => void
}

export function ImageMessage({ url, fileName, status, progress, onClick }: ImageMessageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Simple scheme-based URL validation
  const isValidUrl = (testUrl: string) => {
    try {
      const parsed = new URL(testUrl)
      return ["http:", "https:", "blob:"].includes(parsed.protocol)
    } catch {
      // Could be relative or local blob shorthand
      return testUrl.startsWith("blob:") || testUrl.startsWith("/")
    }
  }

  const isUploading = status === "uploading"
  const isFailed = status === "failed"
  const safeUrl = isValidUrl(url) ? url : ""

  return (
    <div 
      className={cn(
        "relative rounded-xl overflow-hidden bg-gray-100/50 border border-black/5 flex items-center justify-center max-w-[280px] sm:max-w-sm cursor-pointer select-none",
        "aspect-auto min-h-[120px] max-h-64 transition-all duration-300 hover:shadow-md"
      )}
      onClick={() => {
        if (!isUploading && !isFailed && onClick) {
          onClick()
        }
      }}
    >
      {/* 1. Main Image */}
      {safeUrl && !isFailed && (
        <img
          src={safeUrl}
          alt={fileName}
          loading="lazy"
          className={cn(
            "object-cover w-full max-h-64 transition-all duration-500",
            isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-95 blur-md"
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}

      {/* 2. Loading Placeholder (before image loads, or during upload) */}
      {(!isLoaded || isUploading) && !isFailed && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/10 backdrop-blur-[2px] text-gray-600 p-2">
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-orange-500 mb-1" />
              <span className="text-[10px] font-bold text-gray-700">{progress || 0}%</span>
            </>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          )}
        </div>
      )}

      {/* 3. Error / Failed State */}
      {(isFailed || hasError) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/90 text-red-500 p-3 text-center">
          <span className="text-xs font-bold mb-1">Failed to load preview</span>
          <span className="text-[10px] font-medium text-red-400 truncate w-full px-4">{fileName}</span>
        </div>
      )}
    </div>
  )
}
