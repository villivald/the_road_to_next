import {
  EmptyReservations,
  ReservationHelp,
  ReservationsFrame,
} from "@/features/reservation/components/reservations-frame";

export default function LoadingReservations() {
  return (
    <ReservationsFrame loading>
      <EmptyReservations loading />
      <ReservationHelp />
    </ReservationsFrame>
  );
}
