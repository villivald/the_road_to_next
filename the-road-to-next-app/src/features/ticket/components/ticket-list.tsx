import TicketItem from "@/features/ticket/components/ticket-item";
import { getTickets } from "@/features/ticket/queries/get-tickets";

const TicketList = async () => {
  const tickets = await getTickets();

  return (
    <div className="flex flex-1 animate-fade-from-top flex-col items-center gap-y-4">
      {tickets.map((ticket) => (
        <TicketItem key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
};
export default TicketList;
