import { Suspense } from 'react';
import ListingsContent from './listings-content';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ListingsContent />
    </Suspense>
  );
}