import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren } from 'react'
import { createContext, useContext, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './button'

type SidebarContextValue = { open: boolean; setOpen: (open: boolean) => void; toggle: () => void }
const SidebarContext = createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within SidebarProvider')
  return context
}

function SidebarProvider({ defaultOpen = true, className, children, ...props }: PropsWithChildren<{ defaultOpen?: boolean; className?: string } & HTMLAttributes<HTMLDivElement>>) {
  const [open, setOpen] = useState(defaultOpen)
  return <SidebarContext.Provider value={{ open, setOpen, toggle: () => setOpen(current => !current) }}><div data-sidebar-provider data-state={open ? 'expanded' : 'collapsed'} className={cn('min-h-screen w-full', className)} {...props}>{children}</div></SidebarContext.Provider>
}

function Sidebar({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  const { open } = useSidebar()
  return <aside data-sidebar data-state={open ? 'expanded' : 'collapsed'} className={cn(className)} {...props}>{children}</aside>
}

function SidebarHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-sidebar-header className={cn(className)} {...props} />
}

function SidebarContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-sidebar-content className={cn(className)} {...props} />
}

function SidebarFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-sidebar-footer className={cn(className)} {...props} />
}

function SidebarMenu({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <nav data-sidebar-menu className={cn(className)} {...props} />
}

function SidebarMenuButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button data-sidebar-menu-button className={cn('flex w-full items-center gap-3 rounded px-2.5 py-3 text-left text-[13px]', className)} {...props} />
}

function SidebarTrigger({ className, onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, toggle } = useSidebar()
  return <Button type="button" variant="ghost" size="icon" aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={open} className={cn('sidebar-trigger', className)} onClick={event => { toggle(); onClick?.(event) }} {...props}>{open ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}</Button>
}

export { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarProvider, SidebarTrigger, useSidebar }
