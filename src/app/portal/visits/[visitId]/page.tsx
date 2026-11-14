import { VisitDetailView } from "../../../../components/patient-portal/visit-detail-view";

type PatientVisitPageProps = { params: Promise<{ visitId: string }> };

export default async function PatientVisitDetailsPage({ params }: PatientVisitPageProps) {
  const { visitId } = await params;
  return <VisitDetailView visitId={visitId} />;
}
