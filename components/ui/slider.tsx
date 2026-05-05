'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center group',
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-white/15 group-hover:h-1.5 transition-all">
      <SliderPrimitive.Range className="absolute h-full bg-rose" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block size-4 scale-0 group-hover:scale-100 rounded-full bg-rose shadow-lg shadow-rose/50 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose disabled:pointer-events-none" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;
