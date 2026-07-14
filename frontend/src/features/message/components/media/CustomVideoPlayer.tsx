import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Tv, Loader2, RotateCcw, AlertTriangle } from "lucide-react"
import { cn } from "../../../../utils/cn"

interface CustomVideoPlayerProps {
  url: string
  className?: string
  autoPlay?: boolean
}

export function CustomVideoPlayer({ url, className, autoPlay = false }: CustomVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("chat-player-volume")
    return saved ? parseFloat(saved) : 1
  })
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("chat-player-muted") === "true"
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isBuffering, setIsBuffering] = useState(true)
  const [hasEnded, setHasEnded] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const controlsTimeoutRef = useRef<any>(null)

  // Autoplay handler
  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    }
  }, [autoPlay, url])

  // Sync volume with persistence
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
      videoRef.current.muted = isMuted
    }
    localStorage.setItem("chat-player-volume", String(volume))
    localStorage.setItem("chat-player-muted", String(isMuted))
  }, [volume, isMuted])

  // Controls overlay auto-hide timer
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying])

  useEffect(() => {
    resetControlsTimer()
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [resetControlsTimer])

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const handlePlayPause = () => {
    if (!videoRef.current) return
    if (hasEnded) {
      handleReplay()
      return
    }

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Playback error:", err)
          setIsPlaying(false)
        })
    }
  }

  const handleReplay = () => {
    if (!videoRef.current) return
    videoRef.current.currentTime = 0
    setHasEnded(false)
    videoRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setIsBuffering(false)
      setErrorMsg(null)
    }
  }

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = parseFloat(e.target.value)
      videoRef.current.currentTime = time
      setCurrentTime(time)
      setHasEnded(false)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    setIsMuted(vol === 0)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .catch((err) => console.error("Fullscreen error:", err))
    } else {
      document.exitFullscreen()
    }
  }

  const togglePiP = async () => {
    if (!videoRef.current) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await videoRef.current.requestPictureInPicture()
      }
    } catch (err) {
      console.warn("PiP is not supported or failed:", err)
    }
  }

  const handleWaiting = () => setIsBuffering(true)
  const handlePlaying = () => {
    setIsBuffering(false)
    setHasEnded(false)
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setHasEnded(true)
    setShowControls(true)
  }

  const handleError = () => {
    setIsBuffering(false)
    setErrorMsg("Unable to decode or load video file.")
  }

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      className={cn(
        "relative bg-black flex items-center justify-center rounded-2xl overflow-hidden group select-none shadow-2xl transition-all duration-300",
        isFullscreen ? "w-screen h-screen rounded-none" : "w-full max-h-[75vh]",
        className
      )}
    >
      {/* 1. Video Element */}
      <video
        ref={videoRef}
        src={url}
        onClick={handlePlayPause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onEnded={handleEnded}
        onError={handleError}
        className="max-w-full max-h-full object-contain pointer-events-auto z-10"
      />

      {/* 2. Buffering State Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-20">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
        </div>
      )}

      {/* 3. Error Overlay */}
      {errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-30 p-6 text-center gap-3">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <p className="text-sm font-bold">{errorMsg}</p>
          <button 
            type="button"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.load()
                setIsBuffering(true)
                setErrorMsg(null)
              }
            }}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow-lg transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* 4. Replay Center Overlay */}
      {hasEnded && !errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
          <button 
            type="button"
            onClick={handleReplay}
            className="p-4 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/40 shadow-2xl scale-110 active:scale-95 transition-all cursor-pointer"
            title="Replay"
          >
            <RotateCcw className="h-8 w-8" />
          </button>
        </div>
      )}

      {/* 5. Sleek Semi-Transparent Controls Bar (WhatsApp style) */}
      <div 
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex flex-col gap-3 transition-opacity duration-300 z-30 text-white",
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Progress scrub bar */}
        <div className="w-full flex items-center gap-3">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={handleScrubChange}
            className="w-full h-1 rounded-full bg-white/25 accent-orange-500 hover:h-1.5 cursor-pointer transition-all appearance-none"
          />
        </div>

        {/* Buttons and volume bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={handlePlayPause}
              className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            >
              {hasEnded ? (
                <RotateCcw className="h-5 w-5" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5 fill-white" />
              ) : (
                <Play className="h-5 w-5 fill-white ml-0.5" />
              )}
            </button>

            {/* Time progress label */}
            <div className="text-[11px] font-bold text-gray-300 tracking-wider">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-white/30">/</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Volume indicator and slider */}
            <div className="flex items-center gap-2 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                className="p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 rounded-full bg-white/30 accent-orange-500 cursor-pointer hidden group-hover/vol:block transition-all appearance-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Picture in Picture */}
            <button
              type="button"
              onClick={togglePiP}
              className="p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
              title="Picture in Picture"
            >
              <Tv className="h-5 w-5" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
