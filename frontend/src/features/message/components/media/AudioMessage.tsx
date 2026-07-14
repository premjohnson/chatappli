import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Loader2, Music } from "lucide-react"

interface AudioMessageProps {
  url: string
  fileName: string
  status?: "uploading" | "completed" | "failed"
  progress?: number
}

export function AudioMessage({ url, fileName, status, progress }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)

  const isUploading = status === "uploading"
  const isFailed = status === "failed"

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false))
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted
    }
  }, [isMuted])

  // Reset play state when audio ends
  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      setIsLoaded(true)
    }
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || isUploading || isFailed) return
    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const percentage = Math.max(0, Math.min(1, clickX / width))
    audioRef.current.currentTime = percentage * duration
    setCurrentTime(audioRef.current.currentTime)
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="w-full max-w-[280px] sm:max-w-sm rounded-xl p-3 bg-white/70 border border-white/50 shadow-sm flex flex-col gap-2 text-gray-800 backdrop-blur-md select-none">
      {/* Invisible HTML5 Audio Tag */}
      {!isFailed && url && (
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        {isUploading ? (
          <div className="p-2 rounded-full bg-orange-100 text-orange-500">
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          </div>
        ) : isFailed ? (
          <div className="p-2 rounded-full bg-red-100 text-red-500">
            <Music className="h-4.5 w-4.5" />
          </div>
        ) : (
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            {isPlaying ? <Pause className="h-4.5 w-4.5 fill-white" /> : <Play className="h-4.5 w-4.5 fill-white ml-0.5" />}
          </button>
        )}

        {/* Scrub Bar / Progress indicator */}
        <div className="flex-1 flex flex-col gap-1">
          <div 
            ref={progressRef}
            onClick={handleScrub}
            className="relative h-1.5 w-full bg-gray-200 hover:h-2 rounded-full overflow-hidden cursor-pointer transition-all duration-150"
          >
            <div 
              className="absolute left-0 top-0 h-full bg-orange-500 rounded-full transition-all duration-75"
              style={{ width: `${isUploading ? progress || 0 : progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-wider">
            <span>{formatTime(currentTime)}</span>
            <span>{isUploading ? "Uploading..." : isLoaded ? formatTime(duration) : "--:--"}</span>
          </div>
        </div>

        {/* Mute/Unmute */}
        {!isUploading && !isFailed && (
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-black/5 cursor-pointer transition-colors"
          >
            {isMuted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
          </button>
        )}
      </div>

      <div className="text-[10px] text-gray-400 font-bold truncate max-w-full px-1 border-t border-black/5 pt-1.5 flex justify-between items-center">
        <span className="truncate">{fileName}</span>
        {isFailed && <span className="text-red-500 shrink-0 font-black">Upload Failed</span>}
      </div>
    </div>
  )
}
