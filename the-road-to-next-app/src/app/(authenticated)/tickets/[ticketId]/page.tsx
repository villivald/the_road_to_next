import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Separator } from "@/components/ui/separator";
import { getComments } from "@/features/comment/queries/get-comments";
import TicketItem from "@/features/ticket/components/ticket-item";
import { getTicket } from "@/features/ticket/queries/get-ticket";

type TicketPageProps = {
  params: Promise<{ ticketId: string }>;
};

const TicketPage = async ({ params }: TicketPageProps) => {
  const { ticketId } = await params;
  const ticketPromise = getTicket(ticketId);
  const commentsPromise = getComments(ticketId);

  const [ticket, comments] = await Promise.all([
    ticketPromise,
    commentsPromise,
  ]);

  if (!ticket) notFound();

  return (
    <div className="flex flex-1 flex-col gap-y-8">
      <Breadcrumbs
        breadcrumbs={[{ title: "Tickets", href: "/" }, { title: ticket.title }]}
      />

      <Separator />

      <div className="flex animate-fade-from-top justify-center">
        <TicketItem isDetail ticket={ticket} comments={comments} />
      </div>
    </div>
  );
};

export default TicketPage;
