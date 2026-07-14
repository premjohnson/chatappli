import { FileText, FileArchive, FileCode, FileSpreadsheet, FileAudio, FileVideo, File, Download, RefreshCw, X } from "lucide-react"

interface DocumentMessageProps {
  url: string
  fileName: string
  size: number
  mimeType: string
  status?: "uploading" | "completed" | "failed"
  progress?: number
  onCancel?: () => void
  onRetry?: () => void
}

export function DocumentMessage({
  url,
  fileName,
  size,
  mimeType,
  status,
  progress,
  onCancel,
  onRetry
}: DocumentMessageProps) {
  const isUploading = status === "uploading"
  const isFailed = status === "failed"

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return "0 Bytes"
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  const getFileIcon = (mime: string, name: string) => {
    const lowerMime = mime.toLowerCase()
    const ext = name.split(".").pop()?.toLowerCase() || ""

    if (lowerMime.includes("pdf") || ext === "pdf") {
      return <FileText className="h-6 w-6 text-red-500" />
    }
    if (
      lowerMime.includes("zip") ||
      lowerMime.includes("tar") ||
      lowerMime.includes("compressed") ||
      ["zip", "rar", "7z", "tar", "gz"].includes(ext)
    ) {
      return <FileArchive className="h-6 w-6 text-amber-600" />
    }
    if (
      lowerMime.includes("javascript") ||
      lowerMime.includes("typescript") ||
      lowerMime.includes("json") ||
      lowerMime.includes("html") ||
      lowerMime.includes("css") ||
      ["js", "ts", "tsx", "jsx", "html", "css", "json", "py", "java", "cpp", "c", "go"].includes(ext)
    ) {
      return <FileCode className="h-6 w-6 text-indigo-500" />
    }
    if (
      lowerMime.includes("sheet") ||
      lowerMime.includes("excel") ||
      ["xls", "xlsx", "csv"].includes(ext)
    ) {
      return <FileSpreadsheet className="h-6 w-6 text-green-600" />
    }
    if (lowerMime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(ext)) {
      return <FileAudio className="h-6 w-6 text-pink-500" />
    }
    if (lowerMime.startsWith("video/") || ["mp4", "mov", "avi", "mkv"].includes(ext)) {
      return <FileVideo className="h-6 w-6 text-purple-500" />
    }
    return <File className="h-6 w-6 text-blue-500" />
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, "_blank")
    }
  }

  return (
    <div className="w-full max-w-[280px] sm:max-w-sm rounded-xl p-3 bg-white/80 border border-white/60 shadow-sm flex flex-col gap-2.5 text-gray-800 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* File Type Icon */}
        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 shrink-0">
          {getFileIcon(mimeType, fileName)}
        </div>

        {/* File details */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-gray-850 truncate" title={fileName}>
            {fileName}
          </p>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mt-0.5">
            {formatBytes(size)}
          </p>
        </div>

        {/* Action button */}
        <div className="shrink-0 flex items-center gap-1">
          {isUploading && onCancel && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCancel()
              }}
              className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
              title="Cancel upload"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}

          {isFailed && (
            <div className="flex gap-1">
              {onRetry && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRetry()
                  }}
                  className="p-1.5 rounded-lg hover:bg-black/5 text-orange-500 hover:text-orange-600 cursor-pointer transition-colors"
                  title="Retry upload"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
              {onCancel && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancel()
                  }}
                  className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                  title="Delete message"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          )}

          {!isUploading && !isFailed && (
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg hover:bg-black/5 text-gray-500 hover:text-orange-500 cursor-pointer transition-colors shadow-sm bg-white/90 border border-gray-100 hover:border-orange-100"
              title="Download file"
            >
              <Download className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      {isUploading && (
        <div className="w-full flex flex-col gap-1 px-1">
          <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-orange-500 uppercase">
            <span>Uploading...</span>
            <span>{progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-150 h-1 rounded-full overflow-hidden">
            <div
              className="bg-orange-500 h-full transition-all duration-300"
              style={{ width: `${progress || 0}%` }}
            />
          </div>
        </div>
      )}

      {isFailed && (
        <div className="text-[9px] font-black uppercase tracking-widest text-red-500 px-1">
          Upload failed
        </div>
      )}
    </div>
  )
}
