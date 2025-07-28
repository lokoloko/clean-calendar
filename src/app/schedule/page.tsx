import { Suspense } from 'react';
import ScheduleContent from './schedule-content';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';

export default function SchedulePage() {
  return (
    <Suspense 
      fallback={
        <AppLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </AppLayout>
      }
    >
      <ScheduleContent />
    </Suspense>
  );
}