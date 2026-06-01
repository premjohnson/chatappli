import * as React from 'react';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-900/40 ml-3">
            {label}
          </label>
        )}
        <div className="relative group">
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 2 }}
                exit={{ opacity: 0 }}
                className="absolute -inset-1 -z-10 bg-brand-primary/5 blur-lg rounded-[1.5rem]"
              />
            )}
          </AnimatePresence>

          {icon && (
            <div className={cn(
              "absolute left-5 top-1/2 -translate-y-1/2 transition-all duration-500 pointer-events-none z-20",
              isFocused ? "text-brand-primary scale-110" : "text-gray-400"
            )}>
              {icon}
            </div>
          )}
          
          <input
            type={type}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'flex h-13 w-full rounded-[1.5rem] bg-white/20 px-6 py-3.5 text-[15px] font-medium transition-all placeholder:text-gray-400 focus:outline-none focus:bg-white/40 focus:ring-4 focus:ring-brand-primary/5 disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-2xl relative z-10',
              icon && 'pl-14',
              error && 'focus:ring-red-400/10 text-red-900',
              className
            )}
            ref={ref}
            {...props}
          />

          {/* Delicate Internal Glow & Soft Top Reflection */}
          <div className="absolute inset-0 rounded-[1.5rem] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1px_1px_rgba(255,255,255,0.1)] pointer-events-none z-20" />
          
          {/* Faint Edge Luminance */}
          <div className={cn(
            "absolute inset-0 rounded-[1.5rem] border transition-colors duration-500 pointer-events-none z-20",
            isFocused ? "border-white/60" : "border-white/30"
          )} />
        </div>
        
        {error && (
          <motion.p 
            initial={{ opacity: 0, x: -2 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[10px] font-bold uppercase tracking-widest text-red-500 ml-3 flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
