
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context-dev';
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
  BarChart3,
  CalendarClock,
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

// Navigation items for the sidebar.
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/listings', label: 'Listings', icon: Home },
  { href: '/cleaners', label: 'Cleaners', icon: Users },
  { href: '/assignments', label: 'Assignments', icon: Link2 },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/manual-schedules', label: 'Manual Schedules', icon: CalendarClock },
  { href: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Reusable Sidebar component for the application layout.
 * It contains the main navigation links.
 */
function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar>
      {/* Sidebar Header with logo and app name */}
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="group-data-[collapsible=icon]:hidden rounded-full">
                <Sparkles className="h-6 w-6 text-primary" />
            </Button>
            <span className="text-lg font-semibold font-headline group-data-[collapsible=icon]:hidden">
                CleanSweep
            </span>
        </Link>
      </SidebarHeader>
      {/* Sidebar content with navigation menu */}
      <SidebarContent>
        <SidebarMenu>
          {/* Render all navigation items from the navItems array */}
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                {/* Navigation link for each item */}
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      {/* Sidebar footer */}
      <SidebarFooter className='group-data-[collapsible=icon]:hidden'>
        {/* Footer content can be added here if needed */}
      </SidebarFooter>
    </Sidebar>
  );
}

/**
 * Reusable Header component for the application layout.
 * Contains user info and a menu.
 */
function AppHeader() {
    const { toggleSidebar } = useSidebar();
    const { user, signOut } = useAuth();
    return (
        <header className="sticky top-0 z-10 w-full bg-background/50 backdrop-blur-sm">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        {/* Sidebar toggle button for mobile view */}
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
                    {/* User profile and menu */}
                    <div className="flex items-center gap-4">
                        <span className="hidden sm:block font-medium">
                            Welcome, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                        </span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage 
                                            src={user?.user_metadata?.avatar_url || ''} 
                                            alt="User Avatar" 
                                        />
                                        <AvatarFallback>
                                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {user?.user_metadata?.name || 'User'}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user?.email || ''}
                                    </p>
                                </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/settings">Settings</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut()}>
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </header>
    );
}

/**
 * Main application layout component.
 * It wraps pages with the sidebar and header.
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  // Persist sidebar state using a cookie.
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
      <SidebarInset className={cn("transition-all duration-300 ease-in-out flex flex-col min-h-screen")}>
        <AppHeader />
        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
