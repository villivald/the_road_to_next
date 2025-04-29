import { notFound } from "next/navigation";
import TicketItem from "@/features/ticket/components/ticket-item";
import { getTicket } from "@/features/ticket/queries/get-ticket";

type TicketPageProps = {
  params: { ticketId: string };
};

const TicketPage = async ({ params }: TicketPageProps) => {
  const ticket = await getTicket(params.ticketId);

  if (!ticket) notFound();

  return (
    <div className="flex animate-fade-from-top justify-center">
      <TicketItem isDetail ticket={ticket} />
    </div>
  );
};

export default TicketPage;
