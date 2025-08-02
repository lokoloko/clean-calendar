import { notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { AssignCleanersContent } from './assign-cleaners-content';
import { createClient } from '@/lib/supabase-server';

export default async function ListingCleanersPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Get the listing
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();
    
  if (!listing) {
    notFound();
  }
  
  return (
    <AppLayout>
      <AssignCleanersContent listingId={id} listingName={listing.name} />
    </AppLayout>
  );
}