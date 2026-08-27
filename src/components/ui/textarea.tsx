import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={cn('flex min-h-24 w-full resize-y rounded-md border border-[#d8d9d0] bg-[#fbfbf9] px-3 py-2.5 text-sm text-[#242622] outline-none transition-colors placeholder:text-[#a0a29a] focus:border-[#e75f45] focus:ring-2 focus:ring-[#e75f45]/10', className)} {...props} /> }
