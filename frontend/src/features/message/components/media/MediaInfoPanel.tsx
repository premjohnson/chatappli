import { Info, User, Calendar, Database, Eye } from "lucide-react"

interface MediaInfoPanelProps {
  fileName: string
  fileSize: number
  mimeType: string
  uploadDate: string
  senderName: string
  caption?: string
}

export function MediaInfoPanel({
  fileName,
  fileSize,
  mimeType,
  uploadDate,
  senderName,
  caption
}: MediaInfoPanelProps) {
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return "0 Bytes"
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  const formattedDate = new Date(uploadDate).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })

  return (
    <div className="w-80 h-full bg-gray-900 border-l border-white/10 flex flex-col text-white select-none">
      {/* Header */}
      <div className="h-16 border-b border-white/10 flex items-center gap-2 px-6 shrink-0">
        <Info className="h-5 w-5 text-orange-500" />
        <h3 className="font-bold text-sm uppercase tracking-wider">File Information</h3>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {/* Caption Section (if any) */}
        {caption && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <h4 className="text-[10px] font-black uppercase text-orange-400 tracking-widest mb-1.5">Caption</h4>
            <p className="text-sm font-medium leading-relaxed break-words">{caption}</p>
          </div>
        )}

        {/* Sender details */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1">
            <User className="h-3 w-3" /> Shared By
          </span>
          <span className="text-sm font-bold truncate">{senderName}</span>
        </div>

        {/* File name */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1">
            <Eye className="h-3 w-3" /> File Name
          </span>
          <span className="text-sm font-bold break-all leading-snug">{fileName}</span>
        </div>

        {/* File Size */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1">
            <Database className="h-3 w-3" /> File Size
          </span>
          <span className="text-sm font-bold">{formatBytes(fileSize)}</span>
        </div>

        {/* Mime type */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1">
            <Database className="h-3 w-3" /> File Type
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white/5 border border-white/5 rounded-md self-start font-mono">
            {mimeType}
          </span>
        </div>

        {/* Date shared */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Shared At
          </span>
          <span className="text-sm font-bold">{formattedDate}</span>
        </div>
      </div>
    </div>
  )
}
