import * as React from 'react';
import { cn } from '../../utils/cn';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassPanel({ children, className, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'liquid-refinement h-full w-full relative overflow-hidden',
        className
      )}
      {...props}
    >
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}
