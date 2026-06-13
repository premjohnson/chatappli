import { motion } from 'framer-motion';

/**
 * ✨ Liquid Aurora Fog
 * A premium ambient background system designed for luxury VisionOS-style interfaces.
 * Features 6 layers of optical depth, cinematic lighting, and ultra-slow liquid motion.
 */
export function LiquidAuroraFog() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-aurora-base pointer-events-none select-none">
      
      {/* 1. ATMOSPHERIC DEPTH SEPARATION */}
      {/* Cool Pearl/Zinc Base (Bottom Right Depth) */}
      <div className="absolute inset-0 bg-radial from-transparent via-transparent to-aurora-pearl/40 opacity-60" />
      
      {/* 2. WARM AURORA GLOW (Sunlight inside fog) */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.15, 0.3, 0.15],
          x: [-30, 30, -30],
          y: [-20, 20, -20],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-20%] left-[-15%] w-[85%] h-[85%] bg-brand-primary/10 rounded-full blur-[160px] mix-blend-screen"
      />

      {/* 3. LIQUID FOG LAYERS (Translucent depth stacking) */}
      {/* Primary Ivory Fog (Drifting) */}
      <motion.div
        animate={{
          x: [-60, 60, -60],
          y: [-40, 40, -40],
          rotate: [0, 8, 0],
        }}
        transition={{
          duration: 50,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[5%] right-[-5%] w-[90%] h-[90%] bg-aurora-ivory/15 rounded-full blur-[140px] mix-blend-overlay"
      />

      {/* Secondary Luminous Cream Fog (Breathing) */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [40, -40, 40],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-15%] left-[0%] w-[75%] h-[75%] bg-aurora-cream/25 rounded-full blur-[130px] mix-blend-overlay"
      />

      {/* 4. OPTICAL GLASS WAVES (Refractive light ribbons) */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-screen overflow-hidden">
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="50%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <motion.path
            animate={{
              d: [
                "M-200,400 C150,300 350,500 500,400 S850,300 1200,400",
                "M-200,450 C150,350 350,550 500,450 S850,350 1200,450",
                "M-200,400 C150,300 350,500 500,400 S850,300 1200,400",
              ],
            }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
            fill="none"
            stroke="url(#wave-grad-1)"
            strokeWidth="0.8"
          />

          <motion.path
            animate={{
              d: [
                "M-200,700 C200,600 400,800 600,700 S900,600 1200,700",
                "M-200,650 C200,550 400,750 600,650 S900,550 1200,650",
                "M-200,700 C200,600 400,800 600,700 S900,600 1200,700",
              ],
            }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear", delay: 5 }}
            fill="none"
            stroke="url(#wave-grad-1)"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {/* 5. CINEMATIC LIGHTING (Directional Bloom) */}
      {/* Light Shaft from Top-Left */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 via-transparent to-transparent z-10" />
      
      {/* Dynamic Spotlight behind the card */}
      <motion.div 
        animate={{
          opacity: [0.15, 0.25, 0.15],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-radial from-white/30 to-transparent blur-[140px] mix-blend-overlay z-10" 
      />

      {/* 6. SUBTLE FILM GRAIN (Final cinematic layer) */}
      <div className="absolute inset-0 grain-texture opacity-[0.015] contrast-[1.1] z-20" />
      
      {/* Subtle Bottom Haze for Floor Effect */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-aurora-pearl/20 to-transparent z-10" />
    </div>
  );
}
