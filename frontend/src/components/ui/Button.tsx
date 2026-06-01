import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'liquid';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-primary text-white hover:bg-brand-primary/90',
      secondary: 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20',
      outline: 'border border-gray-200 text-gray-600 hover:bg-gray-50',
      ghost: 'text-gray-500 hover:bg-gray-50',
      liquid: 'bg-gradient-to-b from-[#FFC857] to-[#FFB347] text-white tracking-tight',
    };

    const sizes = {
      sm: 'h-9 px-6 text-sm rounded-2xl',
      md: 'h-12 px-8 text-[15px] rounded-2xl md:rounded-3xl',
      lg: 'h-14 px-10 text-lg font-bold rounded-[2rem]',
      icon: 'h-11 w-11 flex items-center justify-center p-0 rounded-2xl',
    };

    // Full-width primary buttons are auto-transformed into Radiant Liquid objects
    const finalVariant = (variant === 'primary' && className?.includes('w-full')) ? 'liquid' : variant;

    return (
      <motion.button
        ref={ref as any}
        whileHover={{ scale: 1.005, y: -0.5 }}
        whileTap={{ scale: 0.99, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        className={cn(
          'relative inline-flex items-center justify-center transition-all focus:outline-none focus:ring-4 focus:ring-brand-primary/10 disabled:opacity-50 disabled:pointer-events-none overflow-hidden font-bold tracking-tight',
          variants[finalVariant],
          sizes[size],
          className
        )}
        disabled={isLoading}
        {...props}
      >
        {finalVariant === 'liquid' && (
          <>
            {/* Soft Directional Bloom */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-white/30 blur-xl rounded-full pointer-events-none z-0" />
            
            {/* Brighter Top Illumination */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent z-10" />
            
            {/* Luminous Edge Highlights */}
            <div className="absolute inset-0 rounded-inherit border border-white/20 mix-blend-overlay z-10 pointer-events-none" />

            {/* Subtle Reflective Shimmer */}
            <motion.div 
              initial={{ x: '-100%', opacity: 0 }}
              whileHover={{ x: '100%', opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 micro-streak opacity-20 pointer-events-none z-10"
            />
          </>
        )}

        {isLoading ? (
          <div className="flex items-center gap-3 relative z-30">
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
            <span className="opacity-90 text-[11px] uppercase tracking-widest font-bold">Syncing</span>
          </div>
        ) : (
          <span className="relative z-30 drop-shadow-sm">{children}</span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
