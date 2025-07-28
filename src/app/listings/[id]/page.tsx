import ListingDetailsContent from './listing-details-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailsPage({ params }: PageProps) {
  const { id } = await params;
  
  return <ListingDetailsContent listingId={id} />;
}