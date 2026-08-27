import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Checkbox = forwardRef<ElementRef<typeof CheckboxPrimitive.Root>, ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root ref={ref} className={cn('peer h-4 w-4 shrink-0 rounded-sm border border-[#bfc1b7] bg-[#fbfbf9] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#e75f45]/40 data-[state=checked]:border-[#e75f45] data-[state=checked]:bg-[#e75f45] data-[state=checked]:text-white disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}>
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check size={12} strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
