import { Input, type InputProps } from '../../../components/ui/Input';

export function AuthInput(props: InputProps) {
  return (
    <Input
      {...props}
      className="bg-white/40 focus:bg-white/80 transition-all border-none shadow-sm"
    />
  );
}
