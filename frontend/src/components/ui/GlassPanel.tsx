import * as React from 'react';
import { cn } from '../../utils/cn';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassPanel({ children, className, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'glass-panel backdrop-blur-3xl h-full w-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
