import * as React from 'react';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';

interface AuthButtonProps extends React.ComponentProps<typeof Button> {
  children: React.ReactNode;
}

export function AuthButton({ children, className, ...props }: AuthButtonProps) {
  return (
    <Button
      className={cn('w-full mt-4 h-12 text-lg rounded-2xl', className)}
      {...props}
    >
      {children}
    </Button>
  );
}
