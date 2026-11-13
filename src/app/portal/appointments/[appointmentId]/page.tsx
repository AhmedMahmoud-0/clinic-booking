import { AppointmentDetailView } from "../../../../components/patient-portal/appointment-detail-view";

type PageProps = { params: Promise<{ appointmentId: string }> };

export default async function PatientAppointmentDetailPage({ params }: PageProps) {
  const { appointmentId } = await params;
  return <AppointmentDetailView appointmentId={appointmentId} />;
}
