import PropertyDetailContent from './property-detail-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const logementId = parseInt(id);

  return <PropertyDetailContent key={logementId} logementId={logementId} />;
}
