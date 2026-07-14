import { ZoomIn, ZoomOut, RotateCw, Download, ExternalLink, Share2, X, RefreshCcw } from "lucide-react"

interface MediaToolbarProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onRotate: () => void
  onDownload: () => void
  onNewTab: () => void
  onClose: () => void
  zoomLevel: number
  isImage: boolean
  isDownloadable: boolean
}

export function MediaToolbar({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onRotate,
  onDownload,
  onNewTab,
  onClose,
  zoomLevel,
  isImage,
  isDownloadable
}: MediaToolbarProps) {
  return (
    <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-50 text-white select-none">
      {/* Zoom / Navigation Info */}
      <div className="text-sm font-bold opacity-80">
        {isImage && `${Math.round(zoomLevel * 100)}%`}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {isImage && (
          <>
            <button
              onClick={onZoomIn}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={onZoomOut}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <button
              onClick={onResetZoom}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Reset Zoom"
            >
              <RefreshCcw className="h-5 w-5" />
            </button>
            <button
              onClick={onRotate}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Rotate"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </>
        )}

        {isDownloadable && (
          <button
            onClick={onDownload}
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </button>
        )}

        <button
          onClick={onNewTab}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          title="Open in New Tab"
        >
          <ExternalLink className="h-5 w-5" />
        </button>

        {/* Share Button (Placeholder) */}
        <button
          onClick={() => alert("Sharing options will be supported in future versions.")}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          title="Share"
        >
          <Share2 className="h-5 w-5" />
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-red-500/80 hover:text-white active:scale-95 transition-all cursor-pointer ml-2"
          title="Close (Esc)"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
