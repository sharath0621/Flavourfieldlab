import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'rust' | 'outline' | 'ghost';
type Size = 'default' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-ink text-paper border border-ink hover:opacity-90',
  rust: 'bg-rust text-paper border border-rust hover:opacity-90',
  outline: 'bg-transparent text-ink border border-rule hover:bg-bg-alt',
  ghost: 'bg-transparent text-ink-soft border-none hover:text-ink'
};
const SIZE_CLASSES: Record<Size, string> = {
  default: 'px-4 py-2.5 text-sm',
  sm: 'px-3 py-1.5 text-xs'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold tracking-tight whitespace-nowrap transition-opacity',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
