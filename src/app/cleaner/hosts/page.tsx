'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Calendar, 
  ChevronRight, 
  Loader2,
  RefreshCw,
  LogOut,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface HostInfo {
  userId: string;
  cleanerId: string;
  hostName: string;
  companyName?: string;
  propertyCount: number;
  upcomingCleanings: number;
  todayCleanings: number;
}

export default function CleanerHostsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hosts, setHosts] = useState<HostInfo[]>([]);
  const [cleanerPhone, setCleanerPhone] = useState<string>('');

  useEffect(() => {
    fetchHosts();
  }, []);

  const fetchHosts = async () => {
    try {
      const response = await fetch('/api/cleaner/hosts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cleaner-token') || 'mock-token'}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/cleaner');
          return;
        }
        throw new Error('Failed to fetch hosts');
      }

      const data = await response.json();
      setHosts(data.hosts);
      setCleanerPhone(data.cleanerPhone);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load your hosts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHosts();
  };

  const handleLogout = () => {
    localStorage.removeItem('cleaner-token');
    router.push('/cleaner');
  };

  const handleHostSelect = (host: HostInfo) => {
    // Store selected host info for the calendar page
    sessionStorage.setItem('selected-host', JSON.stringify({
      userId: host.userId,
      cleanerId: host.cleanerId,
      hostName: host.hostName,
      companyName: host.companyName
    }));
    router.push(`/cleaner/calendar/${host.userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalUpcoming = hosts.reduce((sum, host) => sum + host.upcomingCleanings, 0);
  const totalToday = hosts.reduce((sum, host) => sum + host.todayCleanings, 0);

  return (
    <div className="min-h-screen bg-gray-50 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Your Hosts
              </h1>
              <p className="text-sm text-gray-600">
                Select a host to view schedule
              </p>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="min-h-touch min-w-touch p-2"
              >
                <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="min-h-touch min-w-touch p-2"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Today</p>
                  <p className="text-2xl font-bold text-blue-900">{totalToday}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">This Week</p>
                  <p className="text-2xl font-bold text-green-900">{totalUpcoming}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hosts List */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-700">
            {hosts.length} Host{hosts.length !== 1 ? 's' : ''}
          </h2>
          
          {hosts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hosts found
                </h3>
                <p className="text-sm text-gray-600">
                  You haven't been assigned to any hosts yet
                </p>
              </CardContent>
            </Card>
          ) : (
            hosts.map((host) => (
              <Card 
                key={host.cleanerId}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-all duration-200",
                  "active:scale-[0.98] active:shadow-sm"
                )}
                onClick={() => handleHostSelect(host)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">
                          {host.companyName || host.hostName}
                        </h3>
                      </div>
                      {host.companyName && (
                        <p className="text-sm text-gray-600 mb-2">
                          {host.hostName}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Home className="h-4 w-4" />
                          <span>{host.propertyCount} properties</span>
                        </div>
                        {host.todayCleanings > 0 && (
                          <Badge variant="default" className="text-xs">
                            {host.todayCleanings} today
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {host.upcomingCleanings}
                        </div>
                        <div className="text-xs text-gray-600">this week</div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}