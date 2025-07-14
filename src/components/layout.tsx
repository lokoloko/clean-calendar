"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Home,
  Users,
  Link2,
  CalendarDays,
  Settings,
  Sparkles,
  LayoutDashboard,
  PanelLeft,
  UserCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';


const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/listings', label: 'Listings', icon: Home },
  { href: '/cleaners', label: 'Cleaners', icon: Users },
  { href: '/assignments', label: 'Assignments', icon: Link2 },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="group-data-[collapsible=icon]:hidden rounded-full">
                <Sparkles className="h-6 w-6 text-primary" />
            </Button>
            <span className="text-lg font-semibold font-headline group-data-[collapsible=icon]:hidden">
                CleanSweep
            </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className='group-data-[collapsible=icon]:hidden'>
        {/* Footer content if needed */}
      </SidebarFooter>
    </Sidebar>
  );
}

function AppHeader() {
    const { toggleSidebar } = useSidebar();
    return (
        <header className="sticky top-0 z-10 w-full bg-background/50 backdrop-blur-sm">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={toggleSidebar}
                        >
                            <PanelLeft className="h-6 w-6" />
                            <span className="sr-only">Toggle Sidebar</span>
                        </Button>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden sm:block font-medium">Welcome, Admin</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" />
                                        <AvatarFallback>A</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">Admin</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                    admin@example.com
                                    </p>
                                </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Profile</DropdownMenuItem>
                                <DropdownMenuItem>Billing</DropdownMenuItem>
                                <DropdownMenuItem>Settings</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Log out</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </header>
    );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  // Check for cookie on mount to set initial state
  const [defaultOpen, setDefaultOpen] = useState(true);

  React.useEffect(() => {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('sidebar_state='))
      ?.split('=')[1];
    if (cookieValue) {
      setDefaultOpen(cookieValue === 'true');
    }
  }, []);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className={cn("transition-all duration-300 ease-in-out")}>
        <AppHeader />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
