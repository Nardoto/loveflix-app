import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-white text-black hover:bg-rose hover:text-white shadow-lg shadow-black/30',
        glass:
          'bg-white/15 backdrop-blur-md text-white hover:bg-white/25',
        ghost:
          'bg-transparent text-text-soft hover:bg-white/10 hover:text-white',
        rose: 'bg-rose text-white hover:bg-rose-deep shadow-lg shadow-rose/30',
        outline:
          'bg-rose/15 text-rose-bright hover:bg-rose hover:text-white',
      },
      size: {
        default: 'h-12 px-6 text-sm [&_svg]:size-5',
        sm: 'h-9 px-4 text-xs [&_svg]:size-4',
        lg: 'h-14 px-8 text-base [&_svg]:size-6',
        icon: 'h-11 w-11 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
