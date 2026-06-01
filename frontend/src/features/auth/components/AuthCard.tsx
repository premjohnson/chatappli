import * as React from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { motion } from 'framer-motion';

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

export default function AuthCard({ children, title, subtitle, className }: AuthCardProps) {
  return (
    <GlassCard className={className}>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 1 }}
        className="mb-8 md:mb-10 text-center"
      >
        <h1 className="text-[2.25rem] md:text-[2.75rem] font-bold text-gray-900 mb-2 md:mb-3 tracking-tight leading-none text-restrained">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-900/40 font-bold text-[10px] uppercase tracking-[0.15em] leading-relaxed max-w-[280px] mx-auto opacity-80">
            {subtitle}
          </p>
        )}
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1.5 }}
        className="w-full"
      >
        {children}
      </motion.div>
    </GlassCard>
  );
}
