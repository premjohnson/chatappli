import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LiquidAuroraFog from '../../../components/ui/LiquidAuroraFog';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4 bg-white">
      {/* Premium Ambient Background System */}
      <LiquidAuroraFog />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 55, 
          damping: 24,
          delay: 0.1
        }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </motion.div>
      
      {/* Refined Restrained Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1.5 }}
        className="absolute bottom-10 flex flex-col items-center gap-2 z-10 pointer-events-none"
      >
        <div className="flex flex-col items-center gap-1 opacity-60">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-900/40">
            MyChatApplication
          </p>
          <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-gray-500">
            Secure Liquid Interface v4.5
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
