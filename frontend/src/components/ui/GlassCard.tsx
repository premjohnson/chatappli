import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: 'spring', 
        stiffness: 45, 
        damping: 22 
      }}
      className={cn(
        'rounded-[3.5rem] p-10 md:p-12 relative overflow-hidden liquid-refinement border-none',
        className
      )}
      {...props}
    >
      {/* Gentle Environmental Blending */}
      <div className="absolute inset-0 bg-white/5 pointer-events-none z-0" />
      
      {/* Subtle Glass Sheen */}
      <div className="absolute inset-0 glass-sheen pointer-events-none z-10 mix-blend-screen opacity-70" />
      
      {/* Faint Reflective Haze at Top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-10 mix-blend-overlay" />

      {/* Micro-Reflection Streak */}
      <motion.div
        animate={{
          x: [-500, 1000],
          opacity: [0, 0.15, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-0 left-0 w-48 h-full micro-streak -skew-x-12 z-20 pointer-events-none"
      />

      {/* Content Area */}
      <div className="relative z-30">
        {children}
      </div>
      
    </motion.div>
  );
}
